const connection = require('../app/database')
const generateDatetimeId = require('../utils/genarateDatetimeId')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const dayjs = require('dayjs');

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsIsSelling, goodsRemark = '', goodsRichText = '<p>暂无更多介绍</p>', swiperList = [] } = params;
    
    // 获取连接并开启事务
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {

      // require 的文件中已经通过 getConnection 获取过连接，但这个过程仅仅是检查连接池是否成功创建，并不会对后续的事务操作产生影响。
      // 即使已经调用过 getConnection，在具体的业务逻辑中，仍然需要通过 connections.getConnection() 获取一个新的连接实例来开启事务。连接池的设计就是为了能够高效地管理和复用数据库连接。
      await conn.beginTransaction();  // 开启事务

      const statement1 = `INSERT goods 
        (goods_name, goods_unit, goods_isSelling, goods_remark, goods_richText) 
        VALUES (?, ?, ?, ?, ?)`;

      const result1 = await conn.execute(statement1, [
        goodsName, goodsUnit, goodsIsSelling, goodsRemark, goodsRichText
      ]);

      console.log('result1[0]', result1[0])

      // 提交事务
      await conn.commit();

      return result1[0].insertId
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }
  }

  async updateGoods(params) {
    const { 
      goodsId,
      goodsName, 
      goodsUnit, 
      goodsIsSelling, 
      goodsRemark = '', 
      swiperList = [],
      goodsRichText = '<p>暂无更多介绍</p>', 
    } = params;

    // 获取连接并开启事务
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      // require 的文件中已经通过 getConnection 获取过连接，但这个过程仅仅是检查连接池是否成功创建，并不会对后续的事务操作产生影响。
      // 即使已经调用过 getConnection，在具体的业务逻辑中，仍然需要通过 connections.getConnection() 获取一个新的连接实例来开启事务。连接池的设计就是为了能够高效地管理和复用数据库连接。
      await conn.beginTransaction();  // 开启事务
      // 删除轮播图和富文本的图片记录
      const deleteGoodsMediaFileStatement = `DELETE FROM goods_media WHERE goods_id = ?`
      const deleteGoodsMediaFileResult = await conn.execute(deleteGoodsMediaFileStatement, [goodsId]);
      // 重新插入全部的轮播图和富文本的图片记录
      if (swiperList.length > 0) {
        const statement2 = `INSERT goods_media (goods_id, url, fileType, useType, position) VALUES (?, ?, ?, ?, ?)`;
        
        for (let index = 0; index < swiperList.length; index++) {
          const swiperItem = swiperList[index];
          await conn.execute(statement2, [goodsId, swiperItem.url, swiperItem.type, 'swiper', index])
        }
      }
      let richTextImgSrcList = richTextExtractImageSrc(goodsRichText)
      if (richTextImgSrcList.length > 0) {
        const statement2 = `INSERT goods_media (goods_id, url, fileType, useType) VALUES (?, ?, ?, ?)`;
        
        for (let index = 0; index < richTextImgSrcList.length; index++) {
          const srcItem = richTextImgSrcList[index];
          await conn.execute(statement2, [goodsId, srcItem, 'image', 'richText'])
        }
      }

      // 处理商品基本信息
      const statement1 = `
        UPDATE goods
        SET goods_name = ?, goods_unit = ?, goods_isSelling = ?, goods_remark = ?, goods_richText = ?
        WHERE id = ?
      `

      const result1 = await conn.execute(statement1, [
        goodsName, goodsUnit, goodsIsSelling, goodsRemark, goodsRichText, goodsId
      ]);

      // 处理批次
      if (params.batchType !== undefined) {
        const { 
          goodsId,
          batchType, 
          batchStatus, 
          batchMinPrice, 
          batchMaxPrice,
          batchUnitPrice,
          batchMinQuantity, 
          batchDiscounts,
          batchRemark
        } = params;

        if (params.batchType === 0) { // 预订
          const statement3 = `
            INSERT goods_batch 
            (goods_id, batch_no, batch_type, batch_status, batch_startTime, batch_minPrice, batch_maxPrice, batch_minQuantity, 
            batch_discounts, batch_remark, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `

          const result3 = await conn.execute(statement3, [
            goodsId, generateDatetimeId(), batchType, batchStatus, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
            batchMinPrice, batchMaxPrice, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark,
            goodsName, goodsUnit, goodsRemark, goodsRichText
          ]);
        } else if (params.batchType === 1) { // 现卖
          const statement3 = `
            INSERT goods_batch 
            (goods_id, batch_no, batch_type, batch_status, batch_startTime, batch_unitPrice, batch_minQuantity, batch_discounts, 
            batch_remark, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `

          const result3 = await conn.execute(statement3, [
            goodsId, generateDatetimeId(), batchType, batchStatus, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
            batchUnitPrice, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark,
            goodsName, goodsUnit, goodsRemark, goodsRichText
          ]);
        }

      }

      // 提交事务
      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
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

      const statement1 = `
        SELECT 
          goods.*, 
          goods_media.*,
          goods.id AS goods_id, 
          goods_media.id AS swiper_id
        FROM goods
        LEFT JOIN goods_media ON goods.id = goods_media.goods_id AND goods_media.useType = 'swiper'
        WHERE goods.id = ?
      `
      
      const result1 = await conn.execute(statement1, [id]);
      console.log('result1', result1[0]);
      
      const statement2 = `
        SELECT * FROM goods_batch 
        WHERE goods_batch.goods_id = ? AND goods_batch.batch_status = 1
      `
      
      const result2 = await conn.execute(statement2, [id]);

      // 提交事务
      await conn.commit();

      let swiperList = []
      result1[0].forEach(item => {
        if (item.url) {
          swiperList.push({
            id: item.swiper_id,
            url: item.url,
            type: item.fileType,
            position: item.position
          })
        }
      })

      let goods = {
        goodsId: result1[0][0].goods_id,
        goodsName: result1[0][0].goods_name,
        goodsUnit: result1[0][0].goods_unit,
        goodsIsSelling: result1[0][0].goods_isSelling,
        goodsRemark: result1[0][0].goods_remark,
        goodsRichText: result1[0][0].goods_richText,
        swiperList,
        currentBatch: result2[0] ? result2[0][0] : null
      }

      return goods
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async getGoodsList(params) {
    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    // if (params.hasResponsed !== undefined) {
    //   if (params.hasResponsed === 'true') { // 在前端和后端之间通过 HTTP 请求传递参数时，尤其是在 GET 或 POST 请求的 URL 参数或请求体中，参数都会被转换成字符串格式。
    //     whereClause += ` AND r.response IS NOT NULL`;  // 只返回有回复的评论
    //   } else {
    //     whereClause += ` AND r.response IS NULL`;  // 只返回没有回复的评论
    //   }
    // }

    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM goods`
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;

    // 构建分页查询的 SQL 语句
    const statement = `
      SELECT 
          goods.*, 
          MAX(CASE 
                WHEN goods_batch.batch_status = 1 THEN 1
                ELSE 0 
              END) as hasCurrentBatch
      FROM goods 
      LEFT JOIN goods_batch ON goods.id = goods_batch.goods_id
      GROUP BY goods.id
      ORDER BY goods.createTime DESC 
      LIMIT ? OFFSET ?
    `

    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);

    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

  async endCurrentBatch(params) {
    const { id } = params
    
    const statement = `
      UPDATE goods_batch
        SET batch_status = 0, batch_endTime = ?
        WHERE id = ?
    `
    const result = await connection.execute(statement, [dayjs().format('YYYY-MM-DD HH:mm:ss'), id])
    
    return result[0]
  }

  async getHistoryBatchesList(params) {
    const { id, pageNo, pageSize, batchNo, startTime, endTime } = params
    console.log(startTime);
    console.log(endTime);
    const queryParams = [];
  
    let whereClause = ` WHERE goods_id = ? AND batch_status = 0`
    queryParams.push(id)
  
    if (batchNo) {
      whereClause += ` AND batch_no LIKE ?`
      queryParams.push(`%${batchNo}%`)
    }
  
    if (startTime) {
      whereClause += ` AND batch_startTime >= ?`
      queryParams.push(`${startTime} 00:00:00`)
    }
    if (endTime) {
      whereClause += ` AND batch_endTime <= ?`
      queryParams.push(`${endTime } 23:59:59`)
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM goods_batch` + whereClause;
    console.log(countStatement);
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const offset = (pageNo - 1) * pageSize;
  
    // 构建分页查询的 SQL 语句
    const statement = `SELECT * FROM goods_batch` + whereClause + ` LIMIT ? OFFSET ?`;
    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }
}

module.exports = new GoodsService()