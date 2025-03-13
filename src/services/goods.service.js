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
          batchShipProvinces,
          batchRemark,
          batchStockTotalAmount
        } = params;

        if (batchShipProvinces.length === 0) {
          throw new Error('未填写邮费规则')
        }
        for (const item of batchShipProvinces) {
          if (item.freeShippingNum === 1) { // 1个就包邮
            // 其他就可以不填写
          } else {
            if (item.baseNum > item.freeShippingNum) {
              throw new Error(`包邮数量须大于等于首重最大数量`)
            } else {
              if (!item.baseNum) {
                throw new Error(`${item.name} 首重最大数量 未填写`)
              }
              if (item.baseNum === 0) {
                throw new Error(`${item.name} 首重最大数量 不能为0`)
              }
              if (!item.basePostage) {
                throw new Error(`${item.name} 首重邮费 未填写`)
              }
              if (item.baseNum === 0) {
                throw new Error(`${item.name} 首重邮费 不能为0`)
              }
              if (!item.extraNum) {
                throw new Error(`${item.name} 每续重几件 未填写`)
              }
              if (item.baseNum === 0) {
                throw new Error(`${item.name} 每续重几件 不能为0`)
              }
              if (!item.extraPostage) {
                throw new Error(`${item.name} 续重单位邮费 未填写`)
              }
              if (item.baseNum === 0) {
                throw new Error(`${item.name} 续重单位邮费 不能为0`)
              }
              if (!item.freeShippingNum) {
                throw new Error(`${item.name} 包邮数量 未填写`)
              }
              if (item.baseNum === 0) {
                throw new Error(`${item.name} 包邮数量 不能为0`)
              }
            }
          }          
        }

        let batchStatement = `
          UPDATE goods
            SET batch_no=?, batch_type=?, batch_startTime=?, batch_unitPrice=?, batch_minPrice=?, batch_maxPrice=?, 
                batch_minQuantity=?, batch_discounts=?, batch_shipProvinces=?, batch_remark=?, batch_stock_totalAmount=?, batch_stock_remainingAmount=?
          WHERE id=?
        `;
        
        const batchResult = await conn.execute(batchStatement, [
          batchNo || generateDatetimeId(),
          batchType, 
          batchStartTime || dayjs().format('YYYY-MM-DD HH:mm:ss'),
          batchUnitPrice || null, batchMinPrice || null, batchMaxPrice || null,
          batchMinQuantity, JSON.stringify(batchDiscounts), JSON.stringify(batchShipProvinces), batchRemark, batchStockTotalAmount, batchStockTotalAmount,
          goodsId
        ]);
        
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

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT * FROM goods WHERE id = ? FOR UPDATE`,
        [goodsId]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];

      // ====================== 2. 基础校验 ======================
      if (!batchInfo.batch_no) {
        throw new Error('无当前批次')
      }
      if (batchInfo.batch_type==='preorder' && !batchInfo.batch_preorder_finalPrice) {
        throw new Error('预订阶段无法结束批次')
      }
      
      // ====================== 3. 统计订单状态（优化查询） ======================
      const [ordersStatusResult] = await conn.execute(
        `SELECT 
          COUNT(*) AS totalOrdersCount,
          SUM(num) AS totalAmount,
          SUM(CASE WHEN status IN ('reserved', 'paid') THEN 1 ELSE 0 END) AS unfinishedCount
        FROM orders 
        WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      const {
        totalOrdersCount = 0,
        totalAmount = 0,
        unfinishedCount = 0
      } = ordersStatusResult[0] || {};

      if (unfinishedCount > 0) {
        throw new Error('存在未完结订单，无法结束批次');
      }
      if (totalOrdersCount === 0) {
        throw new Error('订单数为0，无法结束批次');
      }

      // ====================== 计算总收入 ======================
      const [ordersRevenueResult] = await conn.execute(
        `SELECT * FROM orders WHERE batch_no = ? AND status='completed'`,
        [batchInfo.batch_no]
      );

      let totalRevenue = 0
      for (const item of ordersRevenueResult) {
        let revenue = 0
        if (item.batch_type === 'preorder') {
          revenue = Number(item.preorder_finalPrice)*Number(item.num) + Number(item.postage) - Number(item.discountAmount_promotion)
        } else if (item.batch_type === 'stock') {
          revenue = Number(item.stock_unitPrice)*Number(item.num) + Number(item.postage) - Number(item.discountAmount_promotion)
        }
        totalRevenue += revenue
      }

      // ====================== 清空批次信息 ======================
      await conn.execute(
        `UPDATE goods 
        SET 
          goods_isSelling = 0,
          batch_no = NULL,
          batch_type = NULL,
          batch_preorder_finalPrice = NULL,
          batch_startTime = NULL,
          batch_unitPrice = NULL,
          batch_minPrice = NULL,
          batch_maxPrice = NULL,
          batch_minQuantity = NULL,
          batch_discounts = NULL,
          batch_shipProvinces = NULL,
          batch_remark = NULL,
          batch_stock_totalAmount = NULL,
          batch_stock_remainingAmount = NULL
        WHERE id = ?`,
        [goodsId]
      );

      // ====================== 5. 插入历史批次记录 ======================
      const historyData = {
        no: batchInfo.batch_no,
        goods_id: goodsId,
        type: batchInfo.batch_type,
        startTime: batchInfo.batch_startTime,
        endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        preorder_minPrice: batchInfo.batch_minPrice,
        preorder_maxPrice: batchInfo.batch_maxPrice,
        preorder_finalPrice: batchInfo.batch_preorder_finalPrice,
        stock_unitPrice: batchInfo.batch_unitPrice,
        stock_totalAmount: batchInfo.batch_stock_totalAmount,
        minQuantity: batchInfo.batch_minQuantity,
        discounts: JSON.stringify(batchInfo.batch_discounts || []),
        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_shipProvinces || []),
        remark: batchInfo.batch_remark || '',
        status: 'completed',
        totalOrdersCount,
        totalAmount,
        totalRevenue,
        snapshot_goodsName: batchInfo.goods_name,
        snapshot_goodsUnit: batchInfo.goods_unit,
        snapshot_goodsRemark: batchInfo.goods_remark,
        snapshot_goodsRichText: batchInfo.goods_richText
      };

      const historyFields = Object.keys(historyData).join(', ');
      const historyPlaceholders = Object.keys(historyData).fill('?').join(', ');
      await conn.execute(
        `INSERT INTO batch_history (${historyFields}) VALUES (${historyPlaceholders})`,
        Object.values(historyData)
      );

      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      console.log(error)
      await conn.rollback();
      throw error;
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async changeGoodsIsSelling(params) {
    const {  id, value } = params
    
    const batchInfoStatement = `SELECT * FROM goods WHERE id = ?`
    const batchInfoResult = await connection.execute(batchInfoStatement, [id])
    const batchInfo = batchInfoResult[0][0]

    if (batchInfo.batch_type==='stock' && batchInfo.batch_stock_remaining <= 0) {
      throw new Error('商品余量为0')
    }
    if (batchInfo.batch_type==='preorder' && batchInfo.batch_preorder_finalPrice) {
      throw new Error('售卖阶段的预订批次无法上架')
    }

    try {
      const updateStatement = `
        UPDATE goods SET goods_isSelling = ? WHERE id = ?
      `
      const updateResult = await connection.execute(updateStatement, [value, id])

      return 'success'
    } catch (error) {
      console.log(error)
      throw error
    }
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
    const { id } = params

    const batchInfoStatement = `SELECT * FROM goods WHERE id=?`
    const batchInfoResult = await connection.execute(batchInfoStatement, [id])
    const batchInfo = batchInfoResult[0][0]

    const totalOrdersStatement = `SELECT COUNT(*) AS totalOrdersCount, SUM(num) AS totalAmount FROM orders WHERE batch_no = ?`
    const totalOrdersResult = await connection.execute(totalOrdersStatement, [batchInfo.batch_no])
    const totalOrdersInfo = totalOrdersResult[0][0]
    
    if (batchInfo.batch_type === 'preorder') { // 预订
      if (!batchInfo.batch_preorder_finalPrice) { // 预订阶段
        const statisticsStatement = `
          SELECT 
            COUNT(*) AS totalOrdersCount,   -- 总订单数量（reserved 和 canceled 订单数量之和）
            COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reservedOrdersCount,   -- reserved 状态的订单数量
            COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceledOrdersCount,   -- canceled 状态的订单数量
            SUM(CASE WHEN status = 'reserved' THEN num ELSE 0 END) AS reservedAmount,   -- reserved 状态的 num 总和
            SUM(CASE WHEN status = 'canceled' THEN num ELSE 0 END) AS canceledAmount   -- canceled 状态的 num 总和
          FROM orders
          WHERE batch_no = ? AND status IN ('reserved', 'canceled')
        `
        const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
        const statisticsInfo = statisticsResult[0][0]

        return {
          totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
          reservedOrdersCount: +statisticsInfo.reservedOrdersCount, // 已预订订单
          canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消订单
          reservedAmount: +statisticsInfo.reservedAmount+statisticsInfo.canceledAmount, // 已预订量
          canceledAmount: +statisticsInfo.canceledAmount, // 已取消量
        }
      } else { // 售卖阶段
        const statisticsStatement = `
          SELECT 
            COUNT(*) AS totalOrdersCount,   -- 总订单数量（reserved 和 canceled 订单数量之和）
            COUNT(CASE WHEN status = 'unpaid' THEN 1 END) AS unpaidOrdersCount,   -- unpaid 状态的订单数量
            COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,   -- paid 状态的订单数量
            COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,   -- completed 状态的订单数量
            COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceledOrdersCount,   -- canceled 状态的订单数量
            COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount,   -- refunded 状态的订单数量
            SUM(CASE WHEN status = 'unpaid' THEN num ELSE 0 END) AS unpaidAmount,   -- unpaid 状态的 num 总和
            SUM(CASE WHEN status = 'paid' THEN num ELSE 0 END) AS paidAmount,   -- paid 状态的 num 总和
            SUM(CASE WHEN status = 'completed' THEN num ELSE 0 END) AS completedAmount,   -- completed 状态的 num 总和
            SUM(CASE WHEN status = 'canceled' THEN num ELSE 0 END) AS canceledAmount,   -- canceled 状态的 num 总和
            SUM(CASE WHEN status = 'refunded' THEN num ELSE 0 END) AS refundedAmount   -- refunded 状态的 num 总和
          FROM orders
          WHERE batch_no = ? AND status IN ('unpaid', 'paid', 'completed', 'canceled', 'refunded')
        `
        const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
        const statisticsInfo = statisticsResult[0][0]

        return {
          totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
          reservedOrdersCount: +statisticsInfo.unpaidOrdersCount+statisticsInfo.paidOrdersCount+statisticsInfo.completedOrdersCount+statisticsInfo.refundedOrdersCount, // 已预订订单
          canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消订单
          reservedAmount: +statisticsInfo.unpaidAmount+statisticsInfo.paidAmount+statisticsInfo.completedAmount+statisticsInfo.refundedAmount, // 已预订量
  
          unpaidOrdersCount: +statisticsInfo.unpaidOrdersCount, // 未付款
          unpaidAmount: +statisticsInfo.unpaidAmount, // 未付款
          paidOrdersCount: +statisticsInfo.paidOrdersCount, // 已付款
          paidAmount: +statisticsInfo.paidAmount, // 已付款
          completedOrdersCount: +statisticsInfo.completedOrdersCount, // 已完成
          completedAmount: +statisticsInfo.completedAmount, // 已完成
          canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消
          canceledAmount: +statisticsInfo.canceledAmount, // 已取消
          refundedOrdersCount: +statisticsInfo.refundedOrdersCount, // 已退款
          refundedAmount: +statisticsInfo.refundedAmount, // 已退款
        }
      }
    } else {
      const statisticsStatement = `
        SELECT 
          COUNT(*) AS totalOrdersCount,   -- 总订单数量
          COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,   -- paid 状态的订单数量
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,   -- completed 状态的订单数量
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount,   -- refunded 状态的订单数量
          SUM(CASE WHEN status = 'paid' THEN num ELSE 0 END) AS paidAmount,   -- paid 状态的 num 总和
          SUM(CASE WHEN status = 'completed' THEN num ELSE 0 END) AS completedAmount,   -- completed 状态的 num 总和
          SUM(CASE WHEN status = 'refunded' THEN num ELSE 0 END) AS refundedAmount   -- refunded 状态的 num 总和
        FROM orders
        WHERE batch_no = ? AND status IN ('unpaid', 'paid', 'completed', 'canceled', 'refunded')
      `
      const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
      const statisticsInfo = statisticsResult[0][0]

      return {
        totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
        reservedAmount: +statisticsInfo.paidAmount+statisticsInfo.completedAmount+statisticsInfo.refundedAmount, // 已预订量

        paidOrdersCount: +statisticsInfo.paidOrdersCount, // 已付款
        paidAmount: +statisticsInfo.paidAmount, // 已付款
        completedOrdersCount: +statisticsInfo.completedOrdersCount, // 已完成
        completedAmount: +statisticsInfo.completedAmount, // 已完成
        refundedOrdersCount: +statisticsInfo.refundedOrdersCount, // 已退款
        refundedAmount: +statisticsInfo.refundedAmount, // 已退款
      }
    }

  }

  async deleteCurrentBatch(params) {
    const { id } = params
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      // ====================== 1. 查询商品信息并加锁 ======================
      const batchInfoStatement = `SELECT * FROM goods WHERE id = ? FOR UPDATE`;  // 加排他锁
      const [batchInfoResult] = await conn.execute(batchInfoStatement, [id]);
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];
      
      // 检查是否存在批次
      if (!batchInfo.batch_no) {
        throw new Error('无当前批次');
      }

      // ====================== 2. 检查是否有订单（事务内查询） ======================
      const ordersCountStatement = `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`;
      const [ordersCountResult] = await conn.execute(ordersCountStatement, [batchInfo.batch_no]);
      if (ordersCountResult[0].totalOrdersCount !== 0) {
        throw new Error('当前批次已有订单');
      }

      // ====================== 3. 执行批次删除操作 ======================
      const deleteCurrentBatchStatement = `
        UPDATE goods
          SET batch_no=NULL, batch_type=NULL, batch_preorder_finalPrice=NULL, batch_startTime=NULL, batch_unitPrice=NULL, 
          batch_minPrice=NULL, batch_maxPrice=NULL, batch_minQuantity=NULL, batch_discounts=NULL,
          batch_shipProvinces=NULL, batch_remark=NULL, batch_stock_totalAmount=NULL, batch_stock_remainingAmount=NULL, goods_isSelling='0'
          WHERE id = ?
      `
      const deleteCurrentBatchResult = await conn.execute(deleteCurrentBatchStatement, [id])

      await conn.commit();

      return 'success'
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      // 释放连接
      conn.release();
    }

  }

  async cancelAllOrdersInCurrentBatch(params) {
    const { thePhone, id, cancelReason } = params;

    // ====================== 参数校验 ======================
    if (!cancelReason?.trim()) {
      throw new Error('取消原因不能为空');
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT * FROM goods WHERE id = ? FOR UPDATE`,
        [id]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];

      // ====================== 2. 基础校验 ======================
      if (!batchInfo.batch_no) {
        throw new Error('无当前批次');
      }
      if (batchInfo.batch_type !== 'preorder') {
        throw new Error('当前非预订批次');
      }

  
      // ====================== 3. 检查订单 ======================
      const [ordersInfoResult] = await conn.execute(
        `SELECT 
           COUNT(*) AS totalOrdersCount, 
           SUM(CASE WHEN status = 'canceled' THEN num ELSE 0 END) AS totalAmount 
         FROM orders 
         WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      
      if (ordersInfoResult[0].totalOrdersCount === 0) {
        throw new Error('当前批次无订单');
      }

      const ordersInfo = ordersInfoResult[0]
      
      
      // ====================== 结束当前批次 ======================
      await conn.execute(
        `UPDATE goods
         SET 
           batch_no = NULL,
           batch_type = NULL,
           batch_preorder_finalPrice = NULL,
           batch_startTime = NULL,
           batch_minPrice = NULL,
           batch_maxPrice = NULL,
           batch_minQuantity = NULL,
           batch_discounts = NULL,
           batch_shipProvinces = NULL,
           batch_remark = NULL,
           goods_isSelling = 0
         WHERE id = ?`,
        [id]
      );
  
      // ====================== 取消所有订单 ======================
      await conn.execute(
        `UPDATE orders
          SET 
            status = 'canceled',
            cancel_by = ?,
            cancel_reason = ?,
            cancel_time = ?
          WHERE 
            batch_no = ? AND status='reserved'`,
        [thePhone, cancelReason, dayjs().format('YYYY-MM-DD HH:mm:ss'), batchInfo.batch_no]
      );
      
      // ====================== 6. 插入历史批次记录 ======================
      const historyData = {
        no: batchInfo.batch_no,
        goods_id: id,
        type: batchInfo.batch_type,
        startTime: batchInfo.batch_startTime,
        endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        preorder_minPrice: batchInfo.batch_minPrice,
        preorder_maxPrice: batchInfo.batch_maxPrice,
        preorder_finalPrice: batchInfo.batch_preorder_finalPrice,
        stock_unitPrice: batchInfo.batch_unitPrice,
        stock_totalAmount: batchInfo.batch_stock_totalAmount,
        minQuantity: batchInfo.batch_minQuantity,
        discounts: JSON.stringify(batchInfo.batch_discounts || []),
        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_shipProvinces || []),
        remark: batchInfo.batch_remark || '',
        status: 'canceled',
        cancel_reason: cancelReason,
        totalOrdersCount: ordersInfo.totalOrdersCount,
        totalAmount: ordersInfo.totalAmount,
        snapshot_goodsName: batchInfo.goods_name,
        snapshot_goodsUnit: batchInfo.goods_unit,
        snapshot_goodsRemark: batchInfo.goods_remark,
        snapshot_goodsRichText: batchInfo.goods_richText
      };
  
      const historyFields = Object.keys(historyData).join(', ');
      const historyPlaceholders = Array(Object.keys(historyData).length).fill('?').join(', ');
      await conn.execute(
        `INSERT INTO batch_history (${historyFields}) VALUES (${historyPlaceholders})`,
        Object.values(historyData)
      );
  
      await conn.commit();
      return 'success';
    } catch (error) {
      console.log(error);
      await conn.rollback();
      // ====================== 错误处理优化 ======================
      throw error
    } finally {
      conn.release();
    }
  }

  async preorderBatchIsReadyToSell(params) {
    const { goodsId, finalPrice } = params

    // ====================== 参数校验 ======================
    if (typeof finalPrice !== 'number' || finalPrice <= 0) {
      throw new Error('最终价格必须为正数');
    }

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务
      
      // ====================== 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT * FROM goods WHERE id = ? FOR UPDATE`,  // 关键：加排他锁
        [goodsId]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];

      if (!batchInfo.batch_no) {
        throw new Error('无当前批次');
      }
      if (batchInfo.batch_type !== 'preorder') {
        throw new Error('当前非预订批次');  // 修正拼写错误：Errpr -> Error
      }
      if (finalPrice<batchInfo.batch_minPrice || finalPrice>batchInfo.batch_maxPrice) {
        throw new Error('定价不在价格区间内')
      }

      // ====================== 检查订单数量（事务内查询） ======================
      const [ordersCountResult] = await conn.execute(
        `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      if (ordersCountResult[0].totalOrdersCount === 0) {
        throw new Error('当前批次无订单');
      }

      // ====================== 更新批次最终价格 ======================
      await conn.execute(
        `UPDATE goods 
        SET batch_preorder_finalPrice = ?, goods_isSelling = 0
        WHERE id = ?`,
        [finalPrice, goodsId]
      );

      // ====================== 批量更新订单状态 ======================
      const [updateResult] = await conn.execute(
        `
          UPDATE orders 
            SET status = 'unpaid', preorder_finalPrice = ?
          WHERE 
            batch_no = ? AND status = 'reserved'
        `,
        [finalPrice, batchInfo.batch_no]
      );

      // 可选：校验实际更新的订单数
      // if (updateResult.affectedRows !== ordersCountResult[0].totalOrdersCount) {
      //   // --- totalOrdersCount 是全部状态的，updateResult.affectedRows 是reserved状态的， 两者对应不上
      //   throw new Error('订单状态更新数量不一致');
      // }

      await conn.commit();

      return 'success'
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      // 释放连接
      conn.release();
    }
  }
}

module.exports = new GoodsService()