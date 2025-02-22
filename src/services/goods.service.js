const connection = require('../app/database')
const generateDatetimeId = require('../utils/genarateDatetimeId')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config')

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark = '', goodsRichText = '<p>暂无更多介绍</p>', swiperList = [] } = params;
    
    const statement1 = `
      INSERT goods 
        (goods_name, goods_unit, goods_categoryId, goods_isSelling, goods_remark, goods_richText) 
        VALUES (?, ?, ?, ?, ?, ?)
    `

    const result1 = await connection.execute(statement1, [
      goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark, goodsRichText
    ]);

    return result1[0].insertId
  }

  async updateGoods(params) {
    const { 
      goodsId,
      goodsName, 
      goodsUnit,
      goodsCategoryId,
      goodsIsSelling, 
      goodsRemark = '', 
      coverImageUrl,
      swiperList = [],
      goodsRichText = '<p>暂无更多介绍</p>',
    } = params;

    // 获取连接并开启事务
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      // require 的文件中已经通过 getConnection 获取过连接，但这个过程仅仅是检查连接池是否成功创建，并不会对后续的事务操作产生影响。
      // 即使已经调用过 getConnection，在具体的业务逻辑中，仍然需要通过 connections.getConnection() 获取一个新的连接实例来开启事务。连接池的设计就是为了能够高效地管理和复用数据库连接。
      await conn.beginTransaction();  // 开启事务

      // 删除封面图、轮播图和富文本的图片记录
      const deleteGoodsMediaFileStatement = `DELETE FROM goods_media WHERE goods_id = ?`
      const deleteGoodsMediaFileResult = await conn.execute(deleteGoodsMediaFileStatement, [goodsId]);

      // 重新插入轮播图的图片记录
      if (swiperList.length > 0) {
        const statement2 = `INSERT goods_media (goods_id, url, fileType, useType, position) VALUES (?, ?, ?, ?, ?)`;
        
        for (let index = 0; index < swiperList.length; index++) {
          const swiperItem = swiperList[index];
          await conn.execute(statement2, [goodsId, swiperItem.url.replace(`${BASE_URL}/`, ''), swiperItem.type, 'swiper', index])
        }
      }


      // 重新插入富文本的图片记录
      const imgSrcList = richTextExtractImageSrc(goodsRichText).map(url => {
        return url.replace(`${BASE_URL}/`, '')
      })
      console.log('imgSrcList', imgSrcList)
      
      for (const imgFileName of imgSrcList) {
        const goodsRichTextImgsStatement = `
          INSERT goods_media (goods_id, url, fileType, useType) VALUES (?,?,?,?)
        `
        const goodsRichTextImgsResult = await conn.execute(goodsRichTextImgsStatement, [goodsId, imgFileName, 'image', 'richText'])
      }

      // 处理商品基本信息
      const goodsBaseInfoStatement = `
        UPDATE goods
        SET goods_name=?, goods_unit=?, goods_categoryId=?, goods_isSelling=?, goods_remark=?, goods_richText=?, goods_coverImage=?
        WHERE id = ?
      `
      const goodsBaseInfoResult = await conn.execute(goodsBaseInfoStatement, [
        goodsName, 
        goodsUnit, 
        goodsCategoryId, 
        goodsIsSelling, 
        goodsRemark, 
        goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), 
        coverImageUrl.replace(`${BASE_URL}/`, ''),
        goodsId
      ]);

      // 处理批次
      if (params.batchType) {
        console.log('处理批次');
        const {
          batchNo,
          batchType, 
          batchStartTime,
          batchMinPrice, 
          batchMaxPrice,
          batchUnitPrice,
          batchMinQuantity, 
          batchDiscounts,
          batchRemark,
          batchStock
        } = params;

        let batchStatement = `
          UPDATE goods
            SET batch_no=?, batch_type=?, batch_startTime=?, batch_unitPrice=?, batch_minPrice=?, batch_maxPrice=?, 
                batch_minQuantity=?, batch_discounts=?, batch_remark=?, batch_stock=?
          WHERE id=?
        `;
        
        let batchValues = [
          batchNo || generateDatetimeId(),
          batchType, 
          batchStartTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
          batchUnitPrice || null, batchMinPrice || null, batchMaxPrice || null,
          batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark, batchStock,
          goodsId
        ];
        
        const batchResult = await conn.execute(batchStatement, batchValues);
        
      }

      // 提交事务
      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      console.log(error)
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async getGoodsDetailById(params) {
    const { id } = params

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const goodsBaseInfoStatement = `
        SELECT * FROM goods WHERE id = ?
      `
      const goodsBaseInfoResult = await conn.execute(goodsBaseInfoStatement, [id]);

      const goodsSwiperStatement = `
        SELECT * FROM goods_media WHERE goods_id = ? AND useType = 'swiper'
      `
      const goodsSwiperResult = await conn.execute(goodsSwiperStatement, [id]);

      // 提交事务
      await conn.commit();

      let swiperList = goodsSwiperResult[0].map(item => {
        return {
          ...item,
          url: `${BASE_URL}/${item.url}`
        }
      })

      let goods = {
        ...goodsBaseInfoResult[0][0],
        goods_richText: goodsBaseInfoResult[0][0].goods_richText.replaceAll('BASE_URL', BASE_URL),
        goods_coverImage: goodsBaseInfoResult[0][0].goods_coverImage ? `${BASE_URL}/${goodsBaseInfoResult[0][0].goods_coverImage}` : null,
        swiperList,
      }

      return goods
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      console.log(error);
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async getGoodsList(params) {
    const queryParams = [];
    console.log(params);
    let whereClause = ` WHERE 1=1`;

    if (params.goodsNo !== undefined && params.goodsNo) {
      whereClause += ` AND id LIKE ?`;
      queryParams.push(`%${params.goodsNo}%`)
    }
    if (params.goodsName !== undefined && params.goodsName) {
      whereClause += ` AND goods_name LIKE ?`;
      queryParams.push(`%${params.goodsName}%`)
    }
    if (params.goodsCategoryId !== undefined) {
      whereClause += ` AND goods_categoryId = ?`;
      queryParams.push(Number(params.goodsCategoryId))
    }
    if (params.goodsIsSelling !== undefined) {
      whereClause += ` AND goods_isSelling = ?`;
      queryParams.push(params.goodsIsSelling)
    }
    if (params.batchType !== undefined) {
      if (params.batchType!=='null') {
        whereClause += ` AND batch_type = ?`;
        queryParams.push(params.batchType)
      } else if (params.batchType==='null') {
        whereClause += ` AND batch_type IS NULL`;
      }
      
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total FROM goods ${whereClause}
    `
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;

    // 构建分页查询的 SQL 语句
    const statement = 
    `
      SELECT * FROM goods ${whereClause}
      ORDER BY createTime DESC 
      LIMIT ? OFFSET ?
    `

    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);

    return {
      total,  // 总记录数
      records: result[0].map(item => {
        return {
          ...item,
          goods_richText: item.goods_richText.replaceAll('BASE_URL', BASE_URL),
          goods_coverImage: item.goods_coverImage ? `${BASE_URL}/${item.goods_coverImage}` : null
        }
      }),  // 当前页的数据
    };
  }

  async endCurrentBatch(params) {
    const { goodsId } = params
    
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const getBatchInfoStatement = `
        SELECT * FROM goods WHERE id = ?
      `
      const getBatchInfoResult = await connection.execute(getBatchInfoStatement, [goodsId]);
      const batchInfo = getBatchInfoResult[0][0];

      const batchTotalSalesInfoStatement = `
        SELECT COUNT(*) AS totalOrdersCount, SUM(num) AS totalSalesVolumn FROM orders where batch_no = ?
      `
      const batchTotalSalesInfoResult = await connection.execute(batchTotalSalesInfoStatement, [batchInfo.batch_no])
      console.log('batchTotalSalesInfoResult', batchTotalSalesInfoResult);

      const endCurrentBatchStatement = `
        UPDATE goods
          SET batch_no=NULL, batch_type=NULL, batch_startTime=NULL, batch_unitPrice=NULL, 
          batch_minPrice=NULL, batch_maxPrice=NULL, batch_minQuantity=NULL, batch_discounts=NULL,
          batch_remark=NULL, batch_stock=NULL, batch_totalSalesVolumn=NULL,
          goods_isSelling='0'
          WHERE id = ?
      `
      const endCurrentBatchResult = await conn.execute(endCurrentBatchStatement, [goodsId])

      const InsertHistoryBatchStatement = `
        INSERT batch_history 
          (no, goods_id, type, startTime, endTime, unitPrice, minPrice, maxPrice, minQuantity,
            discounts, totalOrdersCount, totalSalesVolumn, coverImage, remark, 
              snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText) 
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `
      const InsertHistoryBatchResult = await conn.execute(InsertHistoryBatchStatement, [
        batchInfo.batch_no, goodsId, batchInfo.batch_type, batchInfo.batch_startTime, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
          batchInfo.batch_unitPrice, batchInfo.batch_minPrice, batchInfo.batch_maxPrice, batchInfo.batch_minQuantity,
          batchInfo.batch_discounts, batchTotalSalesInfoResult[0][0].totalOrdersCount, batchTotalSalesInfoResult[0][0].totalSalesVolumn, batchInfo.goods_coverImage || '', batchInfo.batch_remark,
            batchInfo.goods_name, batchInfo.goods_unit, batchInfo.goods_remark, batchInfo.goods_richText
      ])

      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      console.log(error)
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async changeGoodsIsSelling(params) {
    const { 
      id,
      value
    } = params
    
      const statement = `
        UPDATE goods SET goods_isSelling = ? WHERE id = ?
      `
      const result = await connection.execute(statement, [value, id])

      return 'success'
  }

  async getHistoryBatchesList(params) {
    const { id, pageNo, pageSize, batchNo, startTime, endTime, status } = params

    const queryParams = [];
  
    let whereClause = ` WHERE goods_id = ?`
    queryParams.push(id)
  
    if (batchNo) {
      whereClause += ` AND no LIKE ?`
      queryParams.push(`%${batchNo}%`)
    }
  
    if (startTime) {
      whereClause += ` AND startTime >= ?`
      queryParams.push(`${startTime} 00:00:00`)
    }
    if (endTime) {
      whereClause += ` AND endTime <= ?`
      queryParams.push(`${endTime } 23:59:59`)
    }
    if (status) {
      whereClause += ` AND status = ?`
      queryParams.push(status)
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM batch_history` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const offset = (pageNo - 1) * pageSize;
  
    // 构建分页查询的 SQL 语句
    const statement = `SELECT * FROM batch_history` + whereClause + ` LIMIT ? OFFSET ?`;
    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

  async getGoodsAllBatches(params) {
    const { id } = params

    const queryParams = [];
  
    let whereClause = ` WHERE goods_id = ?`
    queryParams.push(id)
  
    if (batchNo) {
      whereClause += ` AND no LIKE ?`
      queryParams.push(`%${batchNo}%`)
    }
  
    if (startTime) {
      whereClause += ` AND startTime >= ?`
      queryParams.push(`${startTime} 00:00:00`)
    }
    if (endTime) {
      whereClause += ` AND endTime <= ?`
      queryParams.push(`${endTime } 23:59:59`)
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM batch_history` + whereClause;
    
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const offset = (pageNo - 1) * pageSize;
  
    // 构建分页查询的 SQL 语句
    const statement = `SELECT * FROM batch_history` + whereClause + ` LIMIT ? OFFSET ?`;
    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

  async getBatchTotalInfo(params) {
    const { id, batchNo } = params

    const queryParams = [];
  
    let whereClause = ` WHERE batch_no = ?`
    queryParams.push(batchNo)
  
    const statement = `SELECT COUNT(*) AS totalOrdersCount, SUM(num) AS totalSalesVolumn FROM orders` + whereClause
    const result = await connection.execute(statement, queryParams)
  
    return result[0][0]
  }

  async deleteCurrentBatch(params) {
    const { id } = params

    // 判断是否符合删除条件
    const batchInfoStatement = `SELECT * FROM goods WHERE id=?`
    const batchInfoResult = await connection.execute(batchInfoStatement, [id])
    const batchInfo = batchInfoResult[0][0]
    if (!batchInfo.batch_no) {
      throw new Error('无当前批次')
    }
  
    const ordersCountStatement = `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`
    const ordersCountResult = await connection.execute(ordersCountStatement, [batchInfo.batch_no])
    if (ordersCountResult[0][0].totalOrdersCount !== 0) {
      throw new Error('当前批次已有订单')
    }

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const endCurrentBatchStatement = `
        UPDATE goods
          SET batch_no=NULL, batch_type=NULL, batch_startTime=NULL, batch_unitPrice=NULL, 
          batch_minPrice=NULL, batch_maxPrice=NULL, batch_minQuantity=NULL, batch_discounts=NULL,
          batch_remark=NULL, batch_stock=NULL, batch_totalSalesVolumn=NULL,
          goods_isSelling='0'
          WHERE id = ?
      `
      const endCurrentBatchResult = await conn.execute(endCurrentBatchStatement, [id])

      const InsertHistoryBatchStatement = `
        INSERT batch_history 
          (no, goods_id, type, startTime, endTime, unitPrice, minPrice, maxPrice, minQuantity,
            discounts, totalOrdersCount, totalSalesVolumn, coverImage, remark, 
              snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, status) 
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `
      const InsertHistoryBatchResult = await conn.execute(InsertHistoryBatchStatement, [
        batchInfo.batch_no, id, batchInfo.batch_type, batchInfo.batch_startTime, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
          batchInfo.batch_unitPrice, batchInfo.batch_minPrice, batchInfo.batch_maxPrice, batchInfo.batch_minQuantity,
          batchInfo.batch_discounts, 0, 0, batchInfo.goods_coverImage || '', batchInfo.batch_remark,
            batchInfo.goods_name, batchInfo.goods_unit, batchInfo.goods_remark, batchInfo.goods_richText, 'deleted'
      ])

      await conn.commit();

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async cancelAllOrdersInCurrentBatch(params) {
    // 1.修改所有订单状态；2.
    const { id, canceledReason } = params

    // 判断是否符合删除条件
    const batchInfoStatement = `SELECT * FROM goods WHERE id=?`
    const batchInfoResult = await connection.execute(batchInfoStatement, [id])
    const batchInfo = batchInfoResult[0][0]
    if (!batchInfo.batch_no) {
      throw new Error('无当前批次')
    }

    if (batchInfo.batch_type !== 'preorder') {
      throw new Errpr('当前非预订批次')
    }
  
    const ordersCountStatement = `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`
    const ordersCountResult = await connection.execute(ordersCountStatement, [batchInfo.batch_no])
    if (ordersCountResult[0][0].totalOrdersCount === 0) {
      throw new Error('当前批次无订单')
    }

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const cancelAllOrdersStatement = `
        UPDATE orders
          SET status='canceled', canceled_from='self', canceled_reason=?
          WHERE batch_no = ?
      `
      const cancelAllOrdersResult = await conn.execute(cancelAllOrdersStatement, [canceledReason, batchInfo.batch_no])

      const endCurrentBatchStatement = `
        UPDATE goods
          SET batch_no=NULL, batch_type=NULL, batch_startTime=NULL, batch_unitPrice=NULL, 
          batch_minPrice=NULL, batch_maxPrice=NULL, batch_minQuantity=NULL, batch_discounts=NULL,
          batch_remark=NULL, batch_stock=NULL, batch_totalSalesVolumn=NULL,
          goods_isSelling='0'
          WHERE id = ?
      `
      const endCurrentBatchResult = await conn.execute(endCurrentBatchStatement, [id])

      const InsertHistoryBatchStatement = `
        INSERT batch_history 
          (no, goods_id, type, startTime, endTime, unitPrice, minPrice, maxPrice, minQuantity,
            discounts, totalOrdersCount, totalSalesVolumn, coverImage, remark, 
              snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, status) 
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `
      const InsertHistoryBatchResult = await conn.execute(InsertHistoryBatchStatement, [
        batchInfo.batch_no, id, batchInfo.batch_type, batchInfo.batch_startTime, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
          batchInfo.batch_unitPrice, batchInfo.batch_minPrice, batchInfo.batch_maxPrice, batchInfo.batch_minQuantity,
          batchInfo.batch_discounts, 0, 0, batchInfo.goods_coverImage || '', batchInfo.batch_remark,
            batchInfo.goods_name, batchInfo.goods_unit, batchInfo.goods_remark, batchInfo.goods_richText, 'canceled'
      ])

      await conn.commit();

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }
}

module.exports = new GoodsService()