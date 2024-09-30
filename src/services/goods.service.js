const connection = require('../app/database')
const generateDatetimeId = require('../utils/genarateDatetimeId')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const dayjs = require('dayjs');

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark = '', goodsRichText = '<p>暂无更多介绍</p>', swiperList = [] } = params;
    
    // 获取连接并开启事务
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {

      // require 的文件中已经通过 getConnection 获取过连接，但这个过程仅仅是检查连接池是否成功创建，并不会对后续的事务操作产生影响。
      // 即使已经调用过 getConnection，在具体的业务逻辑中，仍然需要通过 connections.getConnection() 获取一个新的连接实例来开启事务。连接池的设计就是为了能够高效地管理和复用数据库连接。
      await conn.beginTransaction();  // 开启事务

      const statement1 = `INSERT goods 
        (goods_name, goods_unit, goods_categoryId, goods_isSelling, goods_remark, goods_richText) 
        VALUES (?, ?, ?, ?, ?, ?)`;

      const result1 = await conn.execute(statement1, [
        goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark, goodsRichText
      ]);

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
      goodsCategoryId,
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
        SET goods_name = ?, goods_unit = ?, goods_categoryId = ?, goods_isSelling = ?, goods_remark = ?, goods_richText = ?
        WHERE id = ?
      `
      const result1 = await conn.execute(statement1, [
        goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark, goodsRichText, goodsId
      ]);

      // 处理批次
      if (params.batchType !== undefined) {
        const { 
          goodsId,
          batchId,
          batchType, 
          batchMinPrice, 
          batchMaxPrice,
          batchUnitPrice,
          batchMinQuantity, 
          batchDiscounts,
          batchRemark
        } = params;

        let statement3 = null
        let values3 = null

        if (batchType === 0) { // 预订
          if (batchId!==undefined && batchId!==null) {
            statement3 = `
              UPDATE goods_batch 
              SET batch_type=?, batch_unitPrice=?, batch_minPrice=?, batch_maxPrice=?, 
              batch_minQuantity=?, batch_discounts=?, batch_remark=?
              WHERE id=?
            `
            values3 = [
              batchType, null, batchMinPrice, batchMaxPrice, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark, batchId
            ]
          } else {
            statement3 = `
              INSERT goods_batch 
              (goods_id, batch_no, batch_type, batch_status, batch_startTime, batch_minPrice, batch_maxPrice, batch_minQuantity, 
              batch_discounts, batch_remark, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            values3 = [
              goodsId, generateDatetimeId(), batchType, 1, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
              batchMinPrice, batchMaxPrice, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark,
              goodsName, goodsUnit, goodsRemark, goodsRichText
            ]
          }
        } else if (params.batchType === 1) { // 现卖
          if (batchId) {
            statement3 = `
              UPDATE goods_batch 
              SET batch_type=?, batch_unitPrice=?, batch_minPrice=?, batch_maxPrice=?, 
              batch_minQuantity=?, batch_discounts=?, batch_remark=?
              WHERE id=?
            `
            values3 = [
              batchType, batchUnitPrice, null, null, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark, batchId
            ]
          } else {
            statement3 = `
              INSERT goods_batch 
              (goods_id, batch_no, batch_type, batch_status, batch_startTime, batch_unitPrice, batch_minQuantity, 
              batch_discounts, batch_remark, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
            values3 = [
              goodsId, generateDatetimeId(), batchType, 1, dayjs().format('YYYY-MM-DD HH:mm:ss'), 
              batchUnitPrice, batchMinQuantity, JSON.stringify(batchDiscounts), batchRemark,
              goodsName, goodsUnit, goodsRemark, goodsRichText
            ]
          }
        }
        console.log('values3', values3);
        const result3 = await conn.execute(statement3, values3);
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
        goodsCategoryId: result1[0][0].goods_categoryId,
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
    let havingClause = '';

    if (params.goodsNo !== undefined && params.goodsNo) {
      whereClause += ` AND id LIKE ?`;  // 只返回有回复的评论
      queryParams.push(`%${params.goodsNo}%`)
    }
    if (params.goodsName !== undefined && params.goodsName) {
      whereClause += ` AND goods_name LIKE ?`;  // 只返回有回复的评论
      queryParams.push(`%${params.goodsName}%`)
    }
    if (params.goodsCategoryId !== undefined) {
      whereClause += ` AND goods_categoryId = ?`;  // 只返回有回复的评论
      queryParams.push(params.goodsCategoryId)
    }
    if (params.goodsIsSelling !== undefined) {
      whereClause += ` AND goods_isSelling = ?`;  // 只返回有回复的评论
      queryParams.push(params.goodsIsSelling)
    }

    if (params.currentBatch !== undefined) {
      havingClause += ` HAVING `;
      if (Number(params.currentBatch) === 0) {
          havingClause += `currentBatchType = 0`;
      } else if (Number(params.currentBatch) === 1) {
          havingClause += `currentBatchType = 1`;
      } else if (Number(params.currentBatch) === -1) {
          havingClause += `currentBatchType IS NULL`;
      }
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total 
      FROM (
          SELECT 
              g.*, 
              MAX(CASE 
                  WHEN gb.batch_status = 1 THEN gb.batch_type 
                  ELSE NULL 
              END) AS currentBatchType
          FROM goods AS g
          LEFT JOIN goods_batch AS gb ON g.id = gb.goods_id
          ${whereClause}
          GROUP BY g.id
          ${havingClause}
      ) AS totalCount
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
      SELECT 
          g.*, 
          gb.id AS currentBatchId,
          gb.batch_no AS currentBatchNo,
          gb.batch_type AS currentBatchType,
          gb.batch_unitPrice AS currentBatchUnitPrice,
          gb.batch_minPrice AS currentBatchMinPrice,
          gb.batch_maxPrice AS currentBatchMaxPrice,
          
          MIN(CASE 
              WHEN gm.fileType = 'image' AND gm.useType = 'swiper' THEN gm.url 
              ELSE NULL 
          END) AS goodsCoverImg  -- 获取最小 position 的图片 url

      FROM (
          SELECT * 
          FROM goods 
          ${whereClause}
      ) AS g
      LEFT JOIN goods_batch AS gb ON g.id = gb.goods_id AND gb.batch_status = 1
      LEFT JOIN goods_media AS gm ON g.id = gm.goods_id  
      GROUP BY g.id, gb.id, gb.batch_no, gb.batch_type, gb.batch_unitPrice, gb.batch_minPrice, gb.batch_maxPrice
      ${havingClause}
      ORDER BY g.createTime DESC 
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
    const { batchId, goodsId } = params
    
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {

      const statement1 = `
      UPDATE goods_batch
          SET batch_status = 0, batch_endTime = ?
          WHERE id = ?
      `
      const result1 = await conn.execute(statement1, [dayjs().format('YYYY-MM-DD HH:mm:ss'), batchId])

      const statement2 = `UPDATE goods SET goods_isSelling = 0 WHERE id = ?`
      const result2 = await conn.execute(statement2, [goodsId])

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

  async getHistoryBatchesList(params) {
    const { id, pageNo, pageSize, batchNo, startTime, endTime } = params

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