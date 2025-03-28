const connection = require('../app/database');

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs')

const wechatService = require('./wechat.service')

const {
  BASE_URL
} = require('../app/config')

class WechatService {

  // 用户收货地址
  async addAddress(params) {
    const { name, phone, create_by, provinceCode, cityCode, districtCode, detail, isDefault } = params

    if (!name) {
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    const conn = await connection.getConnection();
    try {
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
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;

      // 层级验证
      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');

      const insertResult = await conn.execute(`
        INSERT 
          customer_address (name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `, [name, phone, create_by, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault?1:0 ])

      await conn.commit();
      
      return '新增成功'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async editAddress(params) {
    const { id, name, phone, provinceCode, cityCode, districtCode, detail, isDefault } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (!name) {
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    try {
      const [addressExistResult] = await connection.execute(
        `SELECT id FROM customer_address WHERE id = ? LIMIT 1`
        [id]
      );
      if (addressExistResult.length === 0) {
        throw new Error('收获地址不存在')
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
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;
  
      // 层级验证
      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');
  
      const updateResult = await connection.execute(`
        UPDATE customer_address 
        SET name=?, phone=?, province=?, provinceCode=?, city=?, cityCode=?, district=?, districtCode=?, detail=?, isDefault=?
        WHERE id = ?
      `, [
        name, phone, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault, id
      ])
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
  async getAddressList(params) {
    const { create_by } = params

    if (!create_by) {
      throw new Error('缺少参数：create_by')
    }

    try {
      const [result] = await connection.execute(
        `SELECT * from customer_address WHERE create_by=?`, 
        [create_by]
      )
  
      return result
    } catch (error) {
      throw error
    }
  }
  async deleteAddress(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

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
          throw new Error('该收货地址不存在')
        }
  
        throw new Error('删除失败');
      }
  
      return '删除成功'
    } catch (error) {
      throw error
    }
  }
  async getDefaultAddress(params) {
    const { create_by } = params

    if (!create_by) {
      throw new Error('缺少参数：create_by')
    }

    try {
      const result = await connection.execute(
        `SELECT * from customer_address WHERE create_by=? AND isDefault=1 LIMIT 1`, 
        [create_by]
      )
  
      return result[0]
    } catch (error) {
      throw error
    }
  }


  // 用户首页通知
  async notify(params) {
    const { content, thePhone } = params

    if (!content) {
      throw new Error('缺少参数：content')
    }

    try {
      const insertResult = await connection.execute(
        `INSERT wechat_home_notify (content, createBy) VALUES (?,?)`, 
        [content, thePhone]
      )
      return insertResult
    } catch (error) {
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
      throw error
    }
  }
  async getLatestNotification() {
    const [result] = await connection.execute(`SELECT * FROM wechat_home_notify ORDER BY createTime DESC LIMIT 1`);
    
    if (result.length === 0) {
      return '无最近通知'
    } else {
      let record = result[0]
      record.createTime = dayjs(record.createTime).format('YYYY-MM-DD HH:mm')
      return record;
    }
  }
  

  // 首页推荐轮播图
  async getRecommendList(params) {
    try {
      const [result] = await connection.execute(`
        SELECT * FROM wechat_home_recommend
      `, []);
    
      return {
        records: result.map(item => {
          return {
            ...item,
            goodsCoverImageUrl: item.goodsCoverImageUrl ? `${BASE_URL}/${item.goodsCoverImageUrl}` : null,
            customImageUrl: item.customImageUrl ? `${BASE_URL}/${item.customImageUrl}` : null,
          }
        }),
      };
    } catch (error) {
      throw error
    }
  }
  async editRecommendList(params) {
    const { list } = params

    if (!list) {
      throw new Error('缺少参数：list')
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `DELETE FROM wechat_home_recommend`, 
        []
      )

      const placeholders = list.map(() => '(?, ?, ?, ?)').join(',');
      const insertValues = list.map(item => [
        item.goodsId, 
        !item.customImageUrl&&item.coverImageUrl?.replace(`${BASE_URL}/`, '') || null, 
        item.customImageUrl?.replace(`${BASE_URL}/`, '') || null, 
        item.sort
      ])
      
      if (list.length > 0) {
        await conn.execute(
          `INSERT wechat_home_recommend (goods_id, goodsCoverImageUrl, customImageUrl, sort) VALUES ${placeholders}`, 
          insertValues.flat()
        )
      }

      await conn.commit(); 

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async filterUnusableRecommend(params) {
    const conn = await connection.getConnection();

    try {
      await conn.beginTransaction();

      const [recommendResults] = await connection.execute(
        `SELECT goods_id FROM wechat_home_recommend`, 
        []
      )

      if (recommendResults.length === 0) {
        await conn.commit();
        return 'No records to process';
      }

      const goodsIds = recommendResults.map(item => item.goods_id);
      const goodsPla = recommendResults.map(item => '?').join(',')
      const [goodsResults] = await conn.execute(
        `SELECT id, goods_isSelling FROM goods WHERE id IN (${goodsPla})`,
        goodsIds
      );
      
      const idsToDelete = goodsResults
                            .filter(item => item.goods_isSelling === 0)
                            .map(item => item.id);
                            
      const deletePla = idsToDelete.map(item => '?').join(',')
      if (idsToDelete.length > 0) {
        await conn.execute(
          `DELETE FROM wechat_home_recommend WHERE goods_id IN (${deletePla})`,
          idsToDelete
        );
      }

      await conn.commit();
      return 'success';
    } catch (error) {
      await conn.rollback();
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
  }
  async getNewsDetail(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    try {
      const [dataResult] = await connection.execute(`
        SELECT * FROM wechat_home_news WHERE id = ?
      `, [id])
      
      return {
        ...dataResult[0],
        content: dataResult[0].content.replaceAll('BASE_URL', BASE_URL)
      }
    } catch (error) {
      throw error
    }
  }
  async addNews(params) {
    const { title, content } = params

    if (!title) {
      throw new Error('缺少参数：title')
    }
    if (!content) {
      throw new Error('缺少参数：content')
    }

    try {
      const [insertResult] = await connection.execute(`
        INSERT wechat_home_news (title, content) VALUES (?,?)
      `, [title, content.replaceAll(BASE_URL, 'BASE_URL')])
      
      return insertResult
    } catch (error) {
      throw error
    }
  }
  async editNews(params) {
    const { id, title, content } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (!title?.trim()) {
      throw new Error('缺少参数：title')
    }
    if (!content?.trim()) {
      throw new Error('缺少参数：content')
    }

    try {
      const [updateResult] = await connection.execute(
        `UPDATE wechat_home_news 
          SET title = ?, content = ?  
            WHERE id = ? `
        , [title, content.replaceAll(BASE_URL, 'BASE_URL'), id]
      );
      if (updateResult.affectedRows === 0) {
        const [selectResult] = await connection.execute(`
          SELECT id FROM wechat_home_news WHERE id = ? LIMIT 1
        `, [id]);
        if (selectResult.length === 0) {
          throw new Error('该id的数据不存在')
        }
      }
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
  async deleteNews(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    try {
      const [result] = await connection.execute(
        `DELETE FROM wechat_home_news WHERE id = ?`, 
        [id]
      );
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new Error('该id的数据不存在')
        }
  
        throw new Error('删除失败');
      }
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
  async showNews(params) {
    const { id, value } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (value === undefined) {
      throw new Error('缺少参数：value')
    }

    try {
      const [result] = await connection.execute(
        `UPDATE wechat_home_news SET isShow=? WHERE id=? LIMIT 1`, 
        [value, id]
      )
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new Error('该id的数据不存在')
        }
  
        throw new Error('操作失败');
      }
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
  async pinNews(params) {
    const { id, value } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (value === undefined) {
      throw new Error('缺少参数：value')
    }

    try {
      const [result] = await connection.execute(
        `UPDATE wechat_home_news SET isPin=? WHERE id=? LIMIT 1`, 
        [value, id]
      )
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM wechat_home_news WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new Error('该id的数据不存在')
        }
  
        throw new Error('操作失败');
      }
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
}

module.exports = new WechatService()