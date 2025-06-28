const connection = require('../app/database');

const axios = require('axios');

const jwt = require('jsonwebtoken')
const {
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION,
  WX_CONFIG
} = require('../app/config')

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs')

const determineMediaFileType = require('../utils/determineMediaFileType')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const redisUtils = require('../utils/redisUtils')

const {
  BASE_URL
} = require('../app/config');

const { 
  setIdempotencyKey,
} = require('../utils/idempotency')

const logger = require('../utils/logger');

const customError = require('../utils/customError')

class WechatService {
  static accessTokenCache = {
    accessToken: null,
    expireTime: null,
  }
  
  async getPhoneNumber(params) {
    const { code } = params;
    const appid = WX_CONFIG.appid;
    const secret = WX_CONFIG.appsecret;
    
    try {
      // 使用有效的时间比较机制
      const now = Date.now();
      
      // 强制类型转换保证数值类型安全
      if (!WechatService.accessTokenCache.accessToken || Number(WechatService.accessTokenCache.expireTime) <= now) {
        const tokenResponse = await axios.get(
          `https://api.weixin.qq.com/cgi-bin/token`,
          { params: { grant_type: 'client_credential', appid, secret } }
        );
  
        if (tokenResponse.data.errcode) {
          throw new customError.InternalError(`微信token接口错误: ${tokenResponse.data.errmsg}`)
        }
  
        WechatService.accessTokenCache = {
          accessToken: tokenResponse.data.access_token,
          expireTime: now + (Number(tokenResponse.data.expires_in) * 1000 - 3000), // 提前3秒过期保证安全
        };
      }
  
      // 使用更安全的参数传递方式
      const phoneResponse = await axios.post(
        `https://api.weixin.qq.com/wxa/business/getuserphonenumber`,
        { code },
        { params: { access_token: WechatService.accessTokenCache.accessToken } }
      );
  
      if (phoneResponse.data.errcode) {
        throw new customError.InternalError(`微信手机号接口错误: ${phoneResponse.data.errmsg}`)
      }
  
      // 增加数据存在性校验
      if (!phoneResponse.data.phone_info?.phoneNumber) {
        throw new customError.InternalError('微信返回数据格式异常')
      }
  
      // 使用更精确的过期时间计算
      const token = jwt.sign(
        { phone: phoneResponse.data.phone_info.phoneNumber },
        TOKEN_PRIVATE_KEY,
        { expiresIn: TOKEN_DURATION, algorithm: 'RS256' }
      );
  
      return {
        phone: phoneResponse.data.phone_info.phoneNumber,
        token
      };
    } catch (error) {
      logger.error('service', 'service error: getPhoneNumber', { error: error });
      
      throw error
    }
  }

  // 用户收货地址
  async addAddress(params) {
    const { name, phone, create_by, provinceCode, cityCode, districtCode, detail, isDefault } = params

    let conn = null;
    try {

      setIdempotencyKey(params.idempotencyKey)

      conn = await connection.getConnection();
      await conn.beginTransaction();

      if (isDefault) {
        const updateResult = await conn.execute(`
          UPDATE customer_address SET isDefault = 0 WHERE create_by = ? AND isDefault = 1 LIMIT 1
        `, [create_by])
      }

      const [areas] = await conn.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          provinceCode, cityCode, districtCode,
          provinceCode, cityCode, districtCode
        ]
      );
      if (areas.length !== 3) {
        throw new customError.MissingParameterError('地址信息不完整')
      }
      const [province, city, district] = areas;

      // 层级验证
      if (province.level !== 'province') {
        throw new customError.InvalidParameterError('所选省份不在数据库中')
      }
      if (city.parent_code !== province.code) {
        throw new customError.InvalidParameterError('所选市不属于所选省')
      }
      if (district.parent_code !== city.code) {
        throw new customError.InvalidParameterError('所选区不属于所选市')
      }

      const [insertResult] = await conn.execute(`
        INSERT 
          customer_address (name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `, [name, phone, create_by, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault?1:0 ])

      await conn.commit();

      await markIdempotencyKeySuccess(params.idempotencyKey, insertResult.insertId);
      
      return '新增成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: addAddress', { error })

      await markIdempotencyKeyFail(params.idempotencyKey);

      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async editAddress(params) {
    const { id, name, phone, provinceCode, cityCode, districtCode, detail, isDefault } = params

    try {
      
      const [addressExistResult] = await connection.execute(
        `SELECT id FROM customer_address WHERE id = ?`
        [id]
      );
      if (addressExistResult.length === 0) {
        throw new customError.ResourceNotFoundError('该收货地址不存在')
      }

      const [areas] = await connection.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          provinceCode, cityCode, districtCode,
          provinceCode, cityCode, districtCode
        ]
      );
      if (areas.length !== 3) {
        throw new customError.MissingParameterError('收货地址信息不完整')
      }
      const [province, city, district] = areas;
  
      // 层级验证
      if (province.level !== 'province') {
        throw new customError.InvalidParameterError('provinceCode', '所选省份不存在数据库中')
      }
      if (city.parent_code !== province.code) { 
        throw new customError.InvalidParameterError('provinceCode', '所选市不属于所选省')
      }
      if (district.parent_code !== city.code) {
        throw new customError.InvalidParameterError('provinceCode', '所选区不属于所选市')
      }

      const updateResult = await connection.execute(`
        UPDATE customer_address 
        SET name=?, phone=?, province=?, provinceCode=?, city=?, cityCode=?, district=?, districtCode=?, detail=?, isDefault=?
        WHERE id = ?
      `, [
        name, phone, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault, id
      ])
  
      return '编辑成功'
    } catch (error) {
      logger.error('service', 'service error: editAddress', { error })

      throw error
    }
  }
  async getAddressList(params) {
    const { create_by } = params

    try {
      const [result] = await connection.execute(
        `SELECT * from customer_address WHERE create_by=?`, 
        [create_by]
      )
  
      return result
    } catch (error) {
      logger.error('service', 'service error: getAddressList', { error })
      throw error
    }
  }
  async deleteAddress(params) {
    const { id } = params

    try {

      const [result] = await connection.execute(
        `DELETE FROM customer_address WHERE id = ?`, 
        [id]
      );
  
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM customer_address WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new customError.ResourceNotFoundError('该收货地址不存在')
        }
  
        throw new customError.InvalidLogicError('删除失败')
      }
  
      return '删除成功'
    } catch (error) {
      logger.error('service', 'service error: deleteAddress', { error })

      throw error
    }
  }
  async getDefaultAddress(params) {
    const { create_by } = params

    try {
      const result = await connection.execute(
        `SELECT * from customer_address WHERE create_by=? AND isDefault=1 LIMIT 1`, 
        [create_by]
      )
  
      return result[0]
    } catch (error) {
      logger.error('service', 'service error: getDefaultAddress', { error })
      throw error
    }
  }


  // 用户首页通知
  async notify(params) {
    const { content, thePhone } = params

    try {
      const insertResult = await connection.execute(
        `INSERT wechat_home_notify (content, createBy) VALUES (?,?)`, 
        [content, thePhone]
      )

      await redisUtils.delWithVersion('notification:latest')

      return insertResult
    } catch (error) {
      logger.error('service', 'service error: notify', { error })
      throw error
    }
  }
  async getNotificationList(params) {
    const { pageNo, pageSize } = params;
  
    try {
      const [totalResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM wechat_home_notify`, 
        []
      );
    
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
    
      const result = await connection.execute(`
        SELECT * FROM wechat_home_notify 
        ORDER BY createTime DESC 
        LIMIT ? OFFSET ?
      `, [String(pageSizeInt), String(offset)]);
    
      return {
        total: totalResult[0].total,
        records: result[0],
      };
    } catch (error) {
      logger.error('service', 'service error: getNotificationList', { error })
      throw error
    }
  }
  async getLatestNotification() {
    try {
      const redisData = await redisUtils.getWithVersion('notification:latest');
      if (redisData) {
        return redisData;
      }

      const [result] = await connection.execute(`SELECT * FROM wechat_home_notify ORDER BY createTime DESC LIMIT 1`);
    
      if (result.length === 0) {
        return '无最近通知'
      } else {
        let record = result[0]
        record.createTime = dayjs(record.createTime).format('YYYY-MM-DD HH:mm')

        await redisUtils.setWithVersion('notification:latest', record);

        return record;
      }

    } catch (error) {
      logger.error('service', 'service error: getLatestNotification', { error })
      throw error
    }
  }
  

  // 首页推荐轮播图
  async getRecommendList(params) {
    try {
      let redisData = await redisUtils.getWithVersion('recommendList:forWechat')
      if (redisData) {
        return redisData
      }

      const [result] = await connection.execute(`
        SELECT * FROM wechat_home_recommend
      `, []);

      let records = result.map(item => {
        return {
          ...item,
          goodsCoverImageUrl: item.goodsCoverImageUrl ? `${BASE_URL}/${item.goodsCoverImageUrl}` : null,
          customImageUrl: item.customImageUrl ? `${BASE_URL}/${item.customImageUrl}` : null,
        }
      })

      await redisUtils.setWithVersion('recommendList:forWechat', records)
    
      return records
    } catch (error) {
      logger.error('service', 'service error: getRecommendList', { error })
      throw error
    }
  }
  async editRecommendList(params) {
    const { list } = params

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      await conn.execute(`DELETE FROM wechat_home_recommend`, [])

      let insertValues = []
      
      let mediaValues = []

      list.forEach(item => {
        let handledCustomImageUrl = item.customImageUrl?.replace(`${BASE_URL}/`, '') || null

        if (item.customImageUrl) {
          mediaValues.push([
            handledCustomImageUrl,
            'recommend',
            determineMediaFileType(handledCustomImageUrl),
            'wechat_home_recommend',
            'goods_id',
            item.goodsId
          ])
        }

        insertValues.push([
          item.goodsId, 
          !item.customImageUrl&&item.coverImageUrl?.replace(`${BASE_URL}/`, '') || null, 
          handledCustomImageUrl, 
          item.sort
        ])
      })
      
      if (insertValues.length > 0) {
        await conn.execute(
          `INSERT wechat_home_recommend (goods_id, goodsCoverImageUrl, customImageUrl, sort) VALUES ${list.map(() => '(?,?,?,?)').join(',')}`, 
          insertValues.flat()
        )
      }

      // ====================== 处理media ========================
      if (mediaValues.length > 0) {
        await conn.execute(
          `INSERT others_media (url, useType, fileType, relation_table, relation_field, relation_value) VALUES ${mediaValues.map(() => '(?,?,?,?,?,?)').join(',')}`, 
          mediaValues.flat()
        )
      }

      await redisUtils.delWithVersion('recommendList:forWechat')

      await conn.commit(); 

      return '编辑成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: editRecommendList', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async cleanRecommendListAfterNotSelling(params) { // 商品状态变化后清理已下架的推荐商品

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();
      
      const [recommendResults] = await connection.execute(
        `SELECT goods_id FROM wechat_home_recommend`, 
        []
      )
      
      if (recommendResults.length === 0) {
        await conn.commit();
        return 'No records to process';
      }

      const [goodsResults] = await conn.execute(
        `SELECT id, goods_isSelling FROM goods WHERE id IN (${recommendResults.map(() => '?').join(',')})`,
        recommendResults.map(item => item.goods_id)
      );

      const idsToDelete = goodsResults.filter(item => item.goods_isSelling === 0).map(item => item.id);
      
      if (idsToDelete.length > 0) {
        await conn.execute(
          `DELETE FROM others_media WHERE relation_value IN (${idsToDelete.map(() => '?').join(',')})`,
          idsToDelete
        );

        await conn.execute(
          `DELETE FROM wechat_home_recommend WHERE goods_id IN (${idsToDelete.map(() => '?').join(',')})`,
          idsToDelete
        );
      }

      await redisUtils.delWithVersion('recommendList:forWechat')

      await conn.commit();

      return '操作成功';
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: cleanRecommendListAfterNotSelling', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }


  // 资讯
  async getNewsList(params) {
    const { pageNo, pageSize, title, startTime, endTime, showed, pinned } = params;

    let query = ' WHERE 1=1'
    let queryParams = []

    if (title) {
      query += ` AND title LIKE ?`
      queryParams.push(`%${escapeLike(title)}%`)
    }
    if (startTime || endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(startTime || null, startTime || null, endTime || null, endTime || null)
    }
    if (showed !== undefined) {
      if (showed == true)
        query += ` AND isShow = 1`;
      else 
        query += ` AND isShow = 0`;
    }
    if (pinned !== undefined && pinned) {
      if (pinned == true)
        query += ` AND isPin = 1`;
      else 
        query += ` AND isPin = 0`;
    }

    try {
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

      const [totalResult, dataResult] = await Promise.all([
        connection.execute(`
          SELECT COUNT(*) as total FROM wechat_home_news ${query}
        `, queryParams),
        connection.execute(`
          SELECT * from wechat_home_news ${query} 
            ORDER BY createTime DESC 
              LIMIT ? OFFSET ?
        `, [...queryParams, String(pageSizeInt), String(offset)])
      ]);

      return {
        total: totalResult[0][0].total,
        records: dataResult[0].map(item => {
          return {
            ...item,
            content: item.content.replaceAll('BASE_URL', BASE_URL)
          }
        })
      };
    } catch (error) {
      logger.error('service', 'service error: getNewsList', { error })
      throw error   
    }
  }
  async getNewsListForWechat(params) {
    try {
      const redisData = await redisUtils.getWithVersion('newsList:forWechat')
      if (redisData) {
        return redisData
      }
      
      const [result] = await connection.execute(`
        SELECT * from wechat_home_news WHERE isShow = 1
          ORDER BY createTime DESC 
            LIMIT 6
      `, [])

      let records = result.map(item => {
        return {
          ...item,
          content: item.content.replaceAll('BASE_URL', BASE_URL)
        }
      })

      await redisUtils.setWithVersion('newsList:forWechat', records)
  
      return records
    } catch (error) {
      logger.error('service', 'service error: getNewsListForWechat', { error })
      throw error
    }
  }
  async getNewsDetail(params) {
    const { id, flag } = params

    try {
      const redisData = await redisUtils.getWithVersion(`newsDetail:${id}`)
      if (redisData) {
        return redisData
      }
      
      const [dataResult] = await connection.execute(`
        SELECT * FROM wechat_home_news WHERE id = ?
      `, [id])
      if (dataResult.length === 0) {
        throw new customError.ResourceNotFoundError('该资讯不存在')
      }

      let theData = {
        ...dataResult[0],
        content: dataResult[0].content.replaceAll('BASE_URL', BASE_URL)
      }

      if (flag === 'wechat') {
        await redisUtils.setWithVersion(`newsDetail:${id}`, theData)
      }
      
      return theData
    } catch (error) {
      logger.error('service', 'service error: getNewsDetail', { error })
      throw error
    }
  }
  async addNews(params) {
    const { title, content } = params
    
    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const [insertResult] = await conn.execute(`
        INSERT wechat_home_news (title, content) VALUES (?,?)
      `, [title, content.replaceAll(BASE_URL, 'BASE_URL')])

      // ====================== 处理media ========================
      const mediaValues = richTextExtractImageSrc(content).map(url => [
        url.replace(`${BASE_URL}/`, ''),
        'news',
        determineMediaFileType(url),
        'wechat_home_news',
        'id',
        insertResult.insertId
      ])

      if (mediaValues.length > 0) {
        await conn.execute(
          `INSERT others_media (url, useType, fileType, relation_table, relation_field, relation_value) VALUES ${mediaUrls.map(() => '(?,?,?,?,?,?)').join(',')}`, 
          mediaValues.flat()
        )
      }

      await conn.commit(); 

      return insertResult
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: addNews', { error })

      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async editNews(params) {
    const { id, title, content } = params

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const [updateResult] = await conn.execute(
        `UPDATE wechat_home_news 
          SET title = ?, content = ?  
            WHERE id = ? `
        , [title, content.replaceAll(BASE_URL, 'BASE_URL'), id]
      );
      if (updateResult.affectedRows === 0) {
        const [selectResult] = await conn.execute(`
          SELECT id FROM wechat_home_news WHERE id = ?
        `, [id]);
        if (selectResult.length === 0) {
          throw new customError.ResourceNotFoundError('该资讯不存在')
        }
      }

      // ====================== 处理media ========================
      // 删除原有的
      await conn.execute(
        `DELETE FROM others_media WHERE relation_value = ?`,
        [id]
      );

      // 重新插入
      const mediaValues = richTextExtractImageSrc(content).map(url => [
        url.replace(`${BASE_URL}/`, ''),
        'news',
        determineMediaFileType(url),
        'wechat_home_news',
        'id',
        id
      ])

      if (mediaValues.length > 0) {
        await conn.execute(
          `INSERT others_media (url, useType, fileType, relation_table, relation_field, relation_value) VALUES ${mediaValues.map(() => '(?,?,?,?,?,?)').join(',')}`, 
          mediaValues.flat()
        )
      }

      await redisUtils.delWithVersion(`newsDetail:${id}`)

      await conn.commit(); 
  
      return '编辑成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: editNews', { error })

      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async deleteNews(params) {
    const { id } = params

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `DELETE FROM wechat_home_news WHERE id = ?`, 
        [id]
      );
      if (result.affectedRows === 0) {
        const [infoResult] = await conn.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new customError.ResourceNotFoundError('该资讯不存在')
        }
  
        throw new customError.InvalidLogicError('删除失败')
      }

      // ====================== 处理media ========================
      await conn.execute(
        `DELETE FROM others_media WHERE relation_value = ?`,
        [id]
      );

      await redisUtils.delWithVersion('newsList:forWechat')
      await redisUtils.delWithVersion(`newsDetail:${id}`)

      await conn.commit(); 
  
      return '删除成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: deleteNews', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async showNews(params) {
    const { id, value } = params

    try {
      const [result] = await connection.execute(
        `UPDATE wechat_home_news SET isShow=? WHERE id=?`, 
        [value, id]
      )
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new customError.ResourceNotFoundError('该资讯不存在')
        }
  
        throw new customError.InvalidLogicError('操作失败')
      }

      await redisUtils.delWithVersion('newsList:forWechat')
      await redisUtils.delWithVersion(`newsDetail:${id}`)
  
      return '操作成功'
    } catch (error) {
      logger.error('service', 'service error: showNews', { error })
      throw error
    }
  }
  async pinNews(params) {
    const { id, value } = params

    try {
      const [result] = await connection.execute(
        `UPDATE wechat_home_news SET isPin=? WHERE id=?`, 
        [value, id]
      )
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new customError.ResourceNotFoundError('该资讯不存在')
        }
  
        throw new customError.InvalidLogicError('操作失败')
      }

      await redisUtils.delWithVersion('newsList:forWechat')
      await redisUtils.delWithVersion(`newsDetail:${id}`)
  
      return '操作成功'
    } catch (error) {
      logger.error('service', 'service error: pinNews', { error })
      throw error
    }
  }
}

module.exports = new WechatService()