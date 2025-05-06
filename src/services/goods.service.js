const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const escapeLike = require('../utils/escapeLike')

const determineMediaFileType = require('../utils/determineMediaFileType')

const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config');

const {
  generateBatchNo
} = require('../utils/generateSomething')

const wechatService = require('./wechat.service');

const redisUtils = require('../utils/redisUtils')

const logger = require('../utils/logger');

const customError = require('../utils/customError');
const { P } = require('pino');

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsCategoryId, goodsRemark='', goodsRichText='<p>暂无更多介绍</p>' } = params;

    try {
      const result = await connection.execute(`
        INSERT goods 
          (goods_name, goods_unit, goods_categoryId, goods_remark, goods_richText) 
          VALUES (?, ?, ?, ?, ?)
      `, [
        goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark, goodsRichText
      ]);
  
      return result[0].insertId      
    } catch (error) {
      logger.error('service', 'service error: createGoods', { error })
      throw error
    }
  }

  async updateGoods(params) {
    const { 
      thePhone,
      goodsId,
      goodsName, 
      goodsUnit,
      goodsCategoryId,
      goodsIsSelling, 
      goodsRemark = '', 
      coverImageUrl,
      swiperList = [],
      goodsRichText = '<p>暂无更多介绍</p>',

      batchNo,
      batchType, 
      batchStartTime,
      batchPreorderMinPrice, 
      batchPreorderMaxPrice,
      batchStockUnitPrice,
      batchStockTotalQuantity,
      batchMinQuantity, 
      batchDiscountsPromotion,
      batchExtraOptions,
      batchShipProvinces,
      batchShipCanHomeDelivery,
      batchRemark,
    } = params;

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const [currentGoodsInfoResult] = await conn.execute(`SELECT batch_type FROM goods WHERE id = ? FOR UPDATE`, [goodsId]);
      const currentGoodsInfo = currentGoodsInfoResult[0]
      if (currentGoodsInfo.batch_type) {
        throw new customError.InvalidLogicError('商品有当前批次，无法修改')
      }

      // 删除封面图、轮播图和富文本的图片记录
      await conn.execute(`DELETE FROM goods_media WHERE goods_id = ?`, [goodsId]);

      // 重新插入轮播图的图片
      if (swiperList.length > 0) {
        const swiperValues = swiperList.map((item, index) => [
          goodsId, item.url.replace(`${BASE_URL}/`, ''), determineMediaFileType(item.url), 'swiper', index
        ]);
        const placeholders = swiperValues.map(() => '(?, ?, ?, ?, ?)').join(',');
        
        await conn.execute(
          `INSERT INTO goods_media (goods_id, url, fileType, useType, position) VALUES ${placeholders}`,
          swiperValues.flat()
        );
      }
      
      // 重新插入富文本的图片
      const imgSrcList = richTextExtractImageSrc(goodsRichText).map(url => url.replace(`${BASE_URL}/`, ''))
      if (imgSrcList.length > 0) {
        const richTextValues = imgSrcList.map(url => [goodsId, url, determineMediaFileType(url), 'richText']);
        const placeholders = richTextValues.map(() => '(?, ?, ?, ?)').join(',');

        await conn.execute(
          `INSERT INTO goods_media (goods_id, url, fileType, useType) VALUES ${placeholders}`,
          richTextValues.flat()
        );
      }
      
      // 处理商品基本信息
      await conn.execute(`
          UPDATE goods
          SET goods_name=?, goods_unit=?, goods_categoryId=?, goods_isSelling=?, goods_remark=?, goods_richText=?, goods_coverImage=?
          WHERE id = ?
        `, 
        [
          goodsName, 
          goodsUnit, 
          goodsCategoryId, 
          goodsIsSelling, 
          goodsRemark, 
          goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), 
          coverImageUrl.replace(`${BASE_URL}/`, ''),
          goodsId
        ]
      );

      // 处理批次信息
      if (params.batchType) {
        // 校验额外选项
        let handledBatchExtraOptions = batchExtraOptions || []
        if (batchExtraOptions?.length > 0) { 
          handledBatchExtraOptions = batchExtraOptions.map((item, index) => {
            return {
              id: index,
              ...item,
            }
          })
        }

        let batchStatement = `
          UPDATE goods
            SET batch_startBy=?, batch_no=?, batch_type=?, batch_startTime=?, batch_minQuantity=?, 
                batch_discounts_promotion=?, batch_extraOptions=?, batch_ship_provinces=?, batch_ship_canHomeDelivery=?, batch_remark=?, 
                batch_preorder_minPrice=?, batch_preorder_maxPrice=?, 
                batch_stock_unitPrice=?, batch_stock_totalQuantity=? 
          WHERE id=?
        `;
        const [batchResult] = await conn.execute(batchStatement, [
          thePhone, batchNo || generateBatchNo(), batchType, batchStartTime || dayjs().format('YYYY-MM-DD HH:mm:ss'), batchMinQuantity,
          JSON.stringify(batchDiscountsPromotion||[]), JSON.stringify(handledBatchExtraOptions||[]), JSON.stringify(batchShipProvinces), batchShipCanHomeDelivery, batchRemark,
          batchPreorderMinPrice || null, batchPreorderMaxPrice || null,
          batchStockUnitPrice || null, batchStockTotalQuantity || null,
          goodsId
        ]);
        
      }

      await redisUtils.delWithVersion(`goodsDetail:${goodsId}`)

      await conn.commit();

      return '更新成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: updateGoods', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getGoodsDetailById(params) {
    const { id } = params

    try {

      let redisData = await redisUtils.getWithVersion(`goodsDetail:${id}`)
      if (redisData) {
        return redisData
      }

      const [goodsInfo, swiperInfo] = await Promise.all([
        connection.execute(`SELECT * FROM goods WHERE id = ?`, [id]),
        connection.execute(`SELECT * FROM goods_media WHERE goods_id = ? AND useType = 'swiper'`, [id])
      ]);

      if (goodsInfo[0].length === 0) {
        throw new customError.ResourceNotFoundError('商品不存在')
      }

      let swiperList = swiperInfo[0].map(item => {
        return {
          ...item,
          url: `${BASE_URL}/${item.url}`
        }
      })

      let goods = {
        ...goodsInfo[0][0],
        goods_richText: goodsInfo[0][0].goods_richText.replaceAll('BASE_URL', BASE_URL),
        goods_coverImage: goodsInfo[0][0].goods_coverImage ? `${BASE_URL}/${goodsInfo[0][0].goods_coverImage}` : null,
        swiperList,
      }

      await redisUtils.setWithVersion(`goodsDetail:${id}`, goods)

      return goods
    } catch (error) {
      logger.error('service', 'service error: getGoodsDetailById', { error })
      throw error
    }
  }

  async getGoodsList(params) {
    const { pageNo, pageSize, goodsNo, goodsName, goodsCategoryId, goodsIsSelling, batchType } = params;

    const queryParams = [];
    let whereClause = ` WHERE 1=1`;

    if (goodsNo !== undefined && goodsNo) {
      whereClause += ` AND id LIKE ?`;
      queryParams.push(`%${escapeLike(goodsNo)}%`)
    }
    if (goodsName !== undefined && goodsName) {
      whereClause += ` AND goods_name LIKE ?`;
      queryParams.push(`%${escapeLike(goodsName)}%`)
    }
    if (goodsCategoryId !== undefined) {
      whereClause += ` AND goods_categoryId = ?`;
      queryParams.push(Number(goodsCategoryId))
    }
    if (goodsIsSelling !== undefined) {
      whereClause += ` AND goods_isSelling = ?`;
      queryParams.push(goodsIsSelling)
    }
    if (batchType !== undefined) {
      if (batchType === 'null') {
        whereClause += ` AND batch_type IS NULL`;
      } else {
        whereClause += ` AND batch_type = ?`;
        queryParams.push(batchType)
      }
    }

    try {
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

      const [countResult, dataResult] = await Promise.all([
        await connection.execute(`SELECT COUNT(*) as total FROM goods ${whereClause}`, queryParams),
        await connection.execute(`
            SELECT 
              id,
              goods_name,
              goods_unit,
              goods_categoryId,
              goods_coverImage,
              goods_remark,
              goods_isSelling,
              batch_type,
              batch_preorder_finalPrice,
              batch_stock_totalQuantity 
            FROM goods ${whereClause}
            ORDER BY createTime DESC 
            LIMIT ? OFFSET ?
          `, 
          [...queryParams, String(pageSizeInt), String(offset)]
        )
      ])

      let records = await Promise.all(
        dataResult[0].map(async item => {
          let totalOrdersCount = null

          let preorder_reservedQuantity = null;
          let preorder_canceledQuantity = null;
          let preorder_canceledOrdersCount = null
          if (item.batch_type === 'preorder') {
            if (!item.batch_preorder_finalPrice) { // 预订阶段
              totalOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:totalOrdersCount`)
              preorder_reservedQuantity = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:reservedQuantity`)
              preorder_canceledQuantity = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:canceledQuantity`)
              preorder_canceledOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:canceledOrdersCount`)
            } else { // 售卖阶段

            }
          }


          let stock_remainingQuantity = null;
          if (item.batch_type === 'stock') {
            totalOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:stock:totalOrdersCount`)
            stock_remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${item.id}:stock:remainingQuantity`);
          }
      
          return {
            ...item,

            totalOrdersCount,

            batch_preorder_reservedQuantity: preorder_reservedQuantity,
            batch_preorder_canceledQuantity: preorder_canceledQuantity,
            batch_preorder_canceledOrdersCount: preorder_canceledOrdersCount,

            batch_stock_remainingQuantity: stock_remainingQuantity,

            goods_coverImage: item.goods_coverImage ? `${BASE_URL}/${item.goods_coverImage}` : null
          };
        })
      );
  
      return {
        total: countResult[0][0].total,
        records,
      };   
    } catch (error) {
      logger.error('service', 'service error: getGoodsList', { error })
      throw error
    }
  }

  async getGoodsListForWechat(params) {
    const { goodsName, goodsCategoryId } = params;
    
    let redisData = await redisUtils.getWithVersion(`goodsList:forWechat:CategoryId_${goodsCategoryId}`)
    if (redisData) {
      return {
        records: redisData
      }
    }

    const queryParams = [];
    let whereClause = ` WHERE goods_isSelling=1`;

    if (goodsName) {
      whereClause += ` AND goods_name LIKE ?`;
      queryParams.push(`%${escapeLike(goodsName)}%`)
    }
    if (!goodsName && goodsCategoryId && Number.isInteger(goodsCategoryId) && goodsCategoryId>0) {
      whereClause += ` AND goods_categoryId = ?`;
      queryParams.push(Number(goodsCategoryId))
    }

    try {
      const [dataResult] = await connection.execute(`
          SELECT 
            id,
            goods_categoryId,
            goods_name,
            goods_unit,
            goods_coverImage,
            batch_type,
            batch_preorder_minPrice,
            batch_preorder_maxPrice,
            batch_stock_unitPrice
              FROM goods ${whereClause}
                ORDER BY createTime DESC 
        `, 
        [...queryParams]
      )

      let theGoodsList = dataResult.map(item => {
        return {
          ...item,
          goods_coverImage: item.goods_coverImage ? `${BASE_URL}/${item.goods_coverImage}` : null
        }
      })

      if (goodsCategoryId) {
        await redisUtils.setWithVersion(`goodsList:forWechat:CategoryId_${goodsCategoryId}`, theGoodsList)
      }

      return {
        records: theGoodsList
      };   
    } catch (error) {
      logger.error('service', 'service error: getGoodsListForWechat', { error })
      throw error
    }
  }

  async endCurrentBatch(params) {
    const { thePhone, goodsId } = params
    
    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();  // 开启事务

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT * FROM goods WHERE id = ? FOR UPDATE`,
        [goodsId]
      );
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError(`商品不存在`)
      }
      const batchInfo = batchInfoResult[0];

      // ====================== 2. 基础校验 ======================
      if (!batchInfo.batch_no) {
        throw new customError.InvalidLogicError('商品无当前批次')
      }
      if (batchInfo.batch_type==='preorder' && !batchInfo.batch_preorder_finalPrice) {
        throw new customError.InvalidLogicError('预订阶段无法结束批次')
      }
      
      // ====================== 3. 统计订单状态（优化查询） ======================
      const [ordersStatusResult] = await conn.execute(
        `SELECT 
          COUNT(*) AS totalOrdersCount,
          SUM(quantity) AS totalSoldQuantity,
          SUM(CASE WHEN status IN ('reserved', 'paid') THEN 1 ELSE 0 END) AS unfinishedCount
        FROM orders 
        WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      const {
        totalOrdersCount = 0,
        totalSoldQuantity = 0,
        unfinishedCount = 0
      } = ordersStatusResult[0] || {};

      if (unfinishedCount > 0) {
        throw new customError.InvalidLogicError('存在未完结的订单，无法结束批次')
      }
      if (totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('订单数为0，无法结束批次')
      }

      // ====================== 计算总收入 ======================
      const [ordersRevenueResult] = await conn.execute(
        `SELECT 
           batch_type, preorder_finalPrice, quantity, postage, discountAmount_promotion, stock_unitPrice 
        FROM orders WHERE batch_no = ? AND status='completed'`,
        [batchInfo.batch_no]
      );

      let totalRevenue = 0
      for (const item of ordersRevenueResult) {
        let revenue = 0
        if (item.batch_type === 'preorder') {
          revenue = Number(item.preorder_finalPrice)*Number(item.quantity) + Number(item.postage) - Number(item.discountAmount_promotion)
        } else if (item.batch_type === 'stock') {
          revenue = Number(item.stock_unitPrice)*Number(item.quantity) + Number(item.postage) - Number(item.discountAmount_promotion)
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
          batch_startTime = NULL,
          batch_startBy = NULL,
          batch_preorder_finalPrice = NULL,
          batch_preorder_startSelling_time = NULL,
          batch_preorder_startSelling_by = NULL,
          batch_preorder_minPrice = NULL,
          batch_preorder_maxPrice = NULL,
          batch_stock_unitPrice = NULL,
          batch_stock_totalQuantity = NULL,
          batch_minQuantity = NULL,
          batch_discounts_promotion = NULL,
          batch_ship_provinces = NULL,
          batch_remark = NULL,
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
        preorder_minPrice: batchInfo.batch_preorder_minPrice,
        preorder_maxPrice: batchInfo.batch_preorder_maxPrice,
        preorder_startSelling_time: batchInfo.batch_preorder_startSelling_time,
        preorder_startSelling_by: batchInfo.batch_preorder_startSelling_by,
        preorder_finalPrice: batchInfo.batch_preorder_finalPrice,
        stock_unitPrice: batchInfo.batch_stock_unitPrice,
        stock_totalQuantity: batchInfo.batch_stock_totalQuantity,
        minQuantity: batchInfo.batch_minQuantity,
        discounts_promotion: JSON.stringify(batchInfo.batch_discounts_promotion || []),
        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_ship_provinces || []),
        remark: batchInfo.batch_remark || '',
        status: 'completed',
        totalOrdersCount,
        totalSoldQuantity,
        totalRevenue,
        start_by: batchInfo.batch_startBy,
        complete_by: thePhone,
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

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${batchInfo.id}`)

      await conn.commit();
      
      this.cleanUselessGoodsDataAfterNotSelling({
        id: goodsId,
        batch_type: batchInfo.batch_type,
      })

      return '操作成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: endCurrentBatch', { error })
      
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async changeGoodsIsSelling(params) {
    const { id, value } = params
    
    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const [batchInfoResult] = await connection.execute(`
        SELECT 
          goods_categoryId,
          batch_no,
          batch_type, 
          batch_preorder_finalPrice, 
          batch_stock_totalQuantity 
        FROM goods 
        WHERE id = ? 
        FOR UPDATE
      `, [id])
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError(`商品不存在`)
      }
      const batchInfo = batchInfoResult[0]
      if (!batchInfo.batch_type) {
        throw new customError.InvalidLogicError('商品无当前批次')
      }

      if (batchInfo.batch_type==='preorder' && batchInfo.batch_preorder_finalPrice) {
        throw new customError.InvalidLogicError('交付阶段无法上架')
      }
      if (batchInfo.batch_type==='stock') {
        const stock_remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)
        if (stock_remainingQuantity <= 0) {
          throw new customError.InvalidLogicError('商品库存为0，无法上架')
        }
      }

      const updateResult = await connection.execute(
        `UPDATE goods SET goods_isSelling = ? WHERE id = ?`, 
        [value, id]
      )

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${id}`)

      
      await conn.commit();

      if (value === 0) { // 下架
        this.cleanUselessGoodsDataAfterNotSelling({
          id,
          batch_type: batchInfo.batch_type,
        })
      } else { // 上架
        if (batchInfo.batch_type==='preorder') {
          this.setGoodsPreorderPendingDataToRedis({
            id,
            batch_type: batchInfo.batch_type,
            batch_no: batchInfo.batch_no,
          })
        } else if (batchInfo.batch_type==='stock') {
          this.setGoodsStockSellingDataToRedis({
            id,
            batch_type: batchInfo.batch_type,
            batch_no: batchInfo.batch_no,
            batch_stock_totalQuantity: batchInfo.batch_stock_totalQuantity,
          })
        }
      }

      return '操作成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: changeGoodsIsSelling', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getHistoryBatchesList(params) {
    const { id, pageNo, pageSize, no, startTime, endTime, status } = params

    const queryParams = [];
  
    let whereClause = ` WHERE goods_id = ?`
    queryParams.push(id)
  
    if (no) {
      whereClause += ` AND no LIKE ?`
      queryParams.push(`%${escapeLike(no)}%`)
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
    
    try {
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

      const [countResult, dataResult] = await Promise.all([
        await connection.execute(
          `SELECT COUNT(*) as total FROM batch_history ${whereClause}`, 
          queryParams
        ),
        await connection.execute(
          `SELECT * FROM batch_history ${whereClause} LIMIT ? OFFSET ?`, 
          [...queryParams, String(pageSizeInt), String(offset)]
        )
      ])
    
      return {
        total: countResult[0][0].total,
        records: dataResult[0],
      };
    } catch (error) {
      logger.error('service', 'service error: getHistoryBatchesList', { error })
      throw error
    }
  }

  async getBatchTotalInfo(params) {
    const { id } = params

    try {
      const [batchInfoResult] = await connection.execute(
        `SELECT batch_no, batch_type, batch_preorder_finalPrice FROM goods WHERE id=?`, 
        [id]
      )
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError(`商品不存在`)
      }
      const batchInfo = batchInfoResult[0]
      if (!batchInfo.batch_type) {
        throw new customError.InvalidLogicError('商品无当前批次')
      }
      
      if (batchInfo.batch_type === 'preorder') { // 预订
        if (!batchInfo.batch_preorder_finalPrice) { // 预订阶段
          // const statisticsStatement = `
          //   SELECT 
          //     COUNT(*) AS totalOrdersCount,   -- 总订单数量（reserved 和 canceled 订单数量之和）
          //     COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reservedOrdersCount,   -- reserved 状态的订单数量
          //     COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceledOrdersCount,   -- canceled 状态的订单数量
          //     SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,   -- reserved 状态的 quantity 总和
          //     SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity   -- canceled 状态的 quantity 总和
          //   FROM orders
          //   WHERE batch_no = ? AND status IN ('reserved', 'canceled')
          // `
          // const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
          // const statisticsInfo = statisticsResult[0][0]
  
          // return {
          //   totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
          //   reservedOrdersCount: +statisticsInfo.reservedOrdersCount, // 已预订订单
          //   canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消订单
          //   reservedQuantity: +statisticsInfo.reservedQuantity+statisticsInfo.canceledQuantity, // 已预订量
          //   canceledQuantity: +statisticsInfo.canceledQuantity, // 已取消量
          // }

          const totalOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:totalOrdersCount`)
          const reservedQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`)
          const reservedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`)
          const canceledQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:canceledQuantity`)
          const canceledOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:canceledOrdersCount`)

          return {
            totalOrdersCount,
            reservedQuantity,
            reservedOrdersCount,
            canceledQuantity,
            canceledOrdersCount,
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
              SUM(CASE WHEN status = 'unpaid' THEN quantity ELSE 0 END) AS unpaidQuantity,   -- unpaid 状态的 quantity 总和
              SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,   -- paid 状态的 quantity 总和
              SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,   -- completed 状态的 quantity 总和
              SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity,   -- canceled 状态的 quantity 总和
              SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity   -- refunded 状态的 quantity 总和
            FROM orders
            WHERE batch_no = ? AND status IN ('unpaid', 'paid', 'completed', 'canceled', 'refunded')
          `
          const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
          const statisticsInfo = statisticsResult[0][0]
  
          return {
            totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
            reservedOrdersCount: +statisticsInfo.unpaidOrdersCount+statisticsInfo.paidOrdersCount+statisticsInfo.completedOrdersCount+statisticsInfo.refundedOrdersCount, // 已预订订单
            canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消订单
            reservedQuantity: +statisticsInfo.unpaidQuantity+statisticsInfo.paidQuantity+statisticsInfo.completedQuantity+statisticsInfo.refundedQuantity, // 已预订量
    
            unpaidOrdersCount: +statisticsInfo.unpaidOrdersCount, // 未付款
            unpaidQuantity: +statisticsInfo.unpaidQuantity, // 未付款
            paidOrdersCount: +statisticsInfo.paidOrdersCount, // 已付款
            paidQuantity: +statisticsInfo.paidQuantity, // 已付款
            completedOrdersCount: +statisticsInfo.completedOrdersCount, // 已完成
            completedQuantity: +statisticsInfo.completedQuantity, // 已完成
            canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消
            canceledQuantity: +statisticsInfo.canceledQuantity, // 已取消
            refundedOrdersCount: +statisticsInfo.refundedOrdersCount, // 已退款
            refundedQuantity: +statisticsInfo.refundedQuantity, // 已退款
          }
        }
      } else if (batchInfo.batch_type === 'stock') {
        // const statisticsStatement = `
        //   SELECT 
        //     COUNT(*) AS totalOrdersCount,   -- 总订单数量
        //     COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,   -- paid 状态的订单数量
        //     COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,   -- completed 状态的订单数量
        //     COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount,   -- refunded 状态的订单数量
        //     SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,   -- paid 状态的 quantity 总和
        //     SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,   -- completed 状态的 quantity 总和
        //     SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity   -- refunded 状态的 quantity 总和
        //   FROM orders
        //   WHERE batch_no = ? AND status IN ('unpaid', 'paid', 'completed', 'canceled', 'refunded')
        // `
        // const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
        // const statisticsInfo = statisticsResult[0][0]
  
        // return {
        //   totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
        //   reservedQuantity: +statisticsInfo.paidQuantity+statisticsInfo.completedQuantity+statisticsInfo.refundedQuantity, // 已预订量
  
        //   paidOrdersCount: +statisticsInfo.paidOrdersCount, // 已付款
        //   paidQuantity: +statisticsInfo.paidQuantity, // 已付款
        //   completedOrdersCount: +statisticsInfo.completedOrdersCount, // 已完成
        //   completedQuantity: +statisticsInfo.completedQuantity, // 已完成
        //   refundedOrdersCount: +statisticsInfo.refundedOrdersCount, // 已退款
        //   refundedQuantity: +statisticsInfo.refundedQuantity, // 已退款
        // }

        const remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)
        const totalOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`)
        const paidQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:paidQuantity`)
        const paidOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:paidOrdersCount`)
        const shippedQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:shippedQuantity`)
        const shippedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:shippedOrdersCount`)
        const completedQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:completedQuantity`)
        const completedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:completedOrdersCount`)
        const refundedQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:refundedQuantity`)
        const refundedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:refundedOrdersCount`)

        return {
          remainingQuantity,
          totalOrdersCount,
          paidQuantity,
          paidOrdersCount,
          shippedQuantity,
          shippedOrdersCount,
          completedQuantity,
          completedOrdersCount,
          refundedQuantity,
          refundedOrdersCount,
        }
      }   
    } catch (error) {
      logger.error('service', 'service error: getBatchTotalInfo', { error })
      throw error
    }
  }

  async deleteCurrentBatch(params) {
    const { id } = params

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT 
          batch_no, 
          goods_categoryId,
          batch_type  
            FROM goods WHERE id = ? FOR UPDATE`, 
        [id]
      );
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError(`商品不存在`)
      }
      const batchInfo = batchInfoResult[0];
      
      if (!batchInfo.batch_no) {
        throw new customError.ResourceNotFoundError('商品无当前批次')
      }

      // ====================== 2. 检查是否有订单（事务内查询） ======================
      const [ordersCountResult] = await conn.execute(
        `SELECT 1 FROM orders WHERE batch_no = ? LIMIT 1`, 
        [batchInfo.batch_no]
      );
      if (ordersCountResult.length > 0) {
        throw new customError.InvalidLogicError('当前批次已有订单，无法删除')
      }

      // ====================== 3. 执行批次删除操作 ======================
      const updateFields = {
        batch_no: null,
        batch_type: null,
        batch_startTime: null,
        batch_startBy: null,
        goods_isSelling: 0,
        batch_preorder_minPrice: null,
        batch_preorder_maxPrice: null,
        batch_preorder_finalPrice: null,
        batch_preorder_startSelling_time: null,
        batch_preorder_startSelling_by: null,
        batch_stock_unitPrice: null,
        batch_stock_totalQuantity: null,
        batch_minQuantity: null,
        batch_discounts_promotion: null,
        batch_ship_provinces: null,
        batch_remark: null,
      };
      
      const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
      await conn.execute(
        `UPDATE goods SET ${setClause} WHERE id = ?`,
        [...Object.values(updateFields), id]
      );

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${id}`)

      await conn.commit();

      this.cleanUselessGoodsDataAfterNotSelling({
        id,
        batch_type: batchInfo.batch_type,
      })

      return '删除成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: deleteCurrentBatch', { error })
      
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async cancelAllOrdersInCurrentBatch(params) {
    const { thePhone, id, cancelReason } = params;

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();

      const nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 统一时间戳

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(`
        SELECT 
          goods_categoryId,
          batch_no, batch_type, batch_startTime, batch_startBy,
          batch_preorder_minPrice, batch_preorder_maxPrice, batch_preorder_finalPrice,
          batch_stock_unitPrice, batch_minQuantity, batch_discounts_promotion, batch_ship_provinces,
          batch_remark, goods_name, goods_unit, goods_remark, goods_richText, goods_coverImage
            FROM goods WHERE id = ? 
            FOR UPDATE
        `,
        [id]
      );
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError('商品不存在')
      }
      const batchInfo = batchInfoResult[0];

      if (!batchInfo.batch_no) {
        throw new customError.ResourceNotFoundError('商品无当前批次')
      }
      if (batchInfo.batch_type !== 'preorder') {
        throw new customError.InvalidLogicError('当前非预订批次')
      }

      // ====================== 3. 检查订单 ======================
      const [ordersInfoResult] = await conn.execute(
        `SELECT 
           COUNT(*) AS totalOrdersCount, 
           SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS totalSoldQuantity 
         FROM orders 
         WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      
      if (ordersInfoResult[0].totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('当前批次无订单')
      }
      const ordersInfo = ordersInfoResult[0]
      
      // ====================== 结束当前批次 ======================
      await conn.execute(
        `UPDATE goods
          SET 
            batch_no = NULL,
            batch_type = NULL,
            batch_startTime = NULL,
            batch_startBy = NULL,
            batch_preorder_minPrice = NULL,
            batch_preorder_maxPrice = NULL,
            batch_preorder_finalPrice = NULL,
            batch_preorder_startSelling_time: NULL,
            batch_preorder_startSelling_by: NULL,
            batch_minQuantity = NULL,
            batch_discounts_promotion = NULL,
            batch_ship_provinces = NULL,
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
        [thePhone, cancelReason, nowTime, batchInfo.batch_no]
      );
      
      // ====================== 6. 插入历史批次记录 ======================
      const historyData = {
        no: batchInfo.batch_no,
        goods_id: id,
        type: batchInfo.batch_type,
        startTime: batchInfo.batch_startTime,
        start_by: batchInfo.batch_startBy,
        endTime: nowTime,
        preorder_minPrice: batchInfo.batch_preorder_minPrice,
        preorder_maxPrice: batchInfo.batch_preorder_maxPrice,
        preorder_finalPrice: batchInfo.batch_preorder_finalPrice,
        stock_unitPrice: batchInfo.batch_stock_unitPrice,
        stock_totalQuantity: batchInfo.batch_stock_totalQuantity,
        minQuantity: batchInfo.batch_minQuantity,
        discounts_promotion: JSON.stringify(batchInfo.batch_discounts_promotion || []),
        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_ship_provinces || []),
        remark: batchInfo.batch_remark || '',
        status: 'canceled',
        cancel_reason: cancelReason,
        cancel_by: thePhone,
        totalOrdersCount: ordersInfo.totalOrdersCount,
        totalSoldQuantity: ordersInfo.totalSoldQuantity,
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

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${id}`)
  
      await conn.commit();

      this.cleanUselessGoodsDataAfterNotSelling({
        id,
        batch_type: batchInfo.batch_type,
      })

      return '操作成功';
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: cancelAllOrdersInCurrentBatch', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async preorderBatchIsReadyToSell(params) {
    const { thePhone, goodsId, finalPrice } = params

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();
      
      // ====================== 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT 
          goods_categoryId,
          batch_no, batch_type, 
          batch_preorder_minPrice, batch_preorder_maxPrice 
            FROM goods WHERE id = ? 
            FOR UPDATE`,
        [goodsId]
      );
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError('商品不存在')
      }
      const batchInfo = batchInfoResult[0];

      if (!batchInfo.batch_no) {
        throw new customError.ResourceNotFoundError('商品无当前批次')
      }
      if (batchInfo.batch_type !== 'preorder') {
        throw new customError.InvalidLogicError('当前非预订批次')
      }
      if (finalPrice<batchInfo.batch_preorder_minPrice || finalPrice>batchInfo.batch_preorder_maxPrice) {
        throw new customError.InvalidLogicError('最终价格不在预订价格范围内')
      }

      // ====================== 检查订单数量（事务内查询） ======================
      const [ordersCountResult] = await conn.execute(
        `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      if (ordersCountResult[0].totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('当前批次无订单')
      }

      // ====================== 更新批次最终价格 ======================
      let nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      await conn.execute(
        `
          UPDATE goods 
            SET batch_preorder_startSelling_time = ?, batch_preorder_startSelling_by = ?, batch_preorder_finalPrice = ?, goods_isSelling = 0 
          WHERE id = ?
        `,
        [nowTime, thePhone, finalPrice, goodsId]
      );

      // ====================== 批量更新订单状态 ======================
      const [updateResult] = await conn.execute(
        `
          UPDATE orders 
            SET status = 'unpaid', preorder_startSelling_time = ?, preorder_startSelling_by = ?, preorder_finalPrice = ? 
          WHERE 
            batch_no = ? AND status = 'reserved'
        `,
        [nowTime, thePhone, finalPrice, batchInfo.batch_no]
      );

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${goodsId}`)

      await conn.commit();

      this.cleanUselessGoodsDataAfterNotSelling({
        id: goodsId,
        batch_type: batchInfo.batch_type,
      })

      return '操作成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: preorderBatchIsReadyToSell', { error })
      
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async getGoodsStockRemainingQuantityFromRedis(params) {
    const { id } = params

    try {
      const remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)

      return {
        remainingQuantity
      }
    } catch (error) {
      logger.error('service', 'service error: getGoodsStockRemainingQuantityFromRedis', { error })
      
      throw error;
    }
  }









  // ========================================= goods工具函数 =========================================

  async cleanUselessGoodsDataAfterNotSelling(params) {
    const { 
      id,
      batch_type, 
    } = params

    // 清理redis库存
    if (batch_type === 'preorder') {
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:totalOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:canceledQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:canceledOrdersCount`)
    } else if (batch_type === 'stock') {
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:paidQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:paidOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:shippedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:shippedOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:completedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:completedOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:refundedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:refundedOrdersCount`)
    }

    wechatService.cleanRecommendListAfterNotSelling()
  }

  async setGoodsPreorderPendingDataToRedis(params) {
    const {
      id,
      batch_no,
      batch_type
    } = params

    try {
      if (!id) {
        throw new customError.MissingParameterError('id')
      }
      if (!batch_no) {
        throw new customError.MissingParameterError('batch_no')
      }
      if (!batch_type) {
        throw new customError.MissingParameterError('batch_type')
      }
      if (batch_type !== 'preorder') {
        throw new customError.InvalidParameterError('batch_type')
      }
      
      // const [result] = await connection.execute(`
      //   SELECT
      //     COUNT(*) AS totalOrdersCount,
      //     SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,
      //     COUNT(CASE WHEN status = 'reserved' THEN 1 ELSE NULL END) AS reservedOrdersCount,
      //     SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity,
      //     COUNT(CASE WHEN status = 'canceled' THEN 1 ELSE NULL END) AS canceledOrdersCount
      //   FROM orders
      //   WHERE batch_no = ?
      // `, [batch_no]);

      const [result] = await connection.execute(`
        SELECT
          COUNT(*) AS totalOrdersCount,
          SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,
          SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity,
        FROM orders
        WHERE batch_no = ?
      `, [batch_no]);
  
      const {
        totalOrdersCount = 0,
        reservedQuantity = 0,
        canceledQuantity = 0,
      } = result[0] || {};
  
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:totalOrdersCount`, Number(totalOrdersCount))
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`, Number(reservedQuantity))
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:canceledQuantity`, Number(canceledQuantity))

    } catch (error) {
      logger.error('service', 'service error: setGoodsPreorderPendingDataToRedis', { error })
      
      throw error
    }
  }

  async setGoodsPreorderSellingDataToRedis(params) {
    const {
      
    } = params

    try {
      
    } catch (error) {
      logger.error('service', 'service error: setGoodsPreorderSellingDataToRedis', { error })
      
      throw error
    }
  }

  async setGoodsStockSellingDataToRedis(params) {
    const {
      id,
      batch_no,
      batch_type,
      batch_stock_totalQuantity,
    } = params

    try {
      if (!id) {
        throw new customError.MissingParameterError('id')
      }
      if (!batch_no) {
        throw new customError.MissingParameterError('batch_no')
      }
      if (!batch_type) {
        throw new customError.MissingParameterError('batch_type')
      }
      if (batch_type !== 'stock') {
        throw new customError.InvalidParameterError('batch_type')
      }
      if (!batch_stock_totalQuantity) {
        throw new customError.MissingParameterError('batch_stock_totalQuantity')
      }

      // const [result] = await connection.execute(`
      //   SELECT
      //     COUNT(*) AS totalOrdersCount,
      //     SUM(quantity) AS totalSoldQuantity,
      //     SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,
      //     COUNT(CASE WHEN status = 'paid' THEN 1 ELSE NULL END) AS paidOrdersCount,
      //     SUM(CASE WHEN status = 'shipped' THEN quantity ELSE 0 END) AS shippedQuantity,
      //     COUNT(CASE WHEN status = 'shipped' THEN 1 ELSE NULL END) AS shippedOrdersCount,
      //     SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,
      //     COUNT(CASE WHEN status = 'completed' THEN 1 ELSE NULL END) AS completedOrdersCount,
      //     SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity,
      //     COUNT(CASE WHEN status = 'refunded' THEN 1 ELSE NULL END) AS refundedOrdersCount
      //   FROM orders
      //   WHERE batch_no = ?
      // `, [batch_no]);

      const [result] = await connection.execute(`
        SELECT
          COUNT(*) AS totalOrdersCount,
          SUM(quantity) AS totalSoldQuantity,
        FROM orders
        WHERE batch_no = ?
      `, [batch_no]);
  
      const {
        totalOrdersCount = 0,
        totalSoldQuantity = 0,
      } = result[0] || {};
  
      const remainingQuantity = Number(batch_stock_totalQuantity) - Number(totalSoldQuantity)
  
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:remainingQuantity`, Number(remainingQuantity))
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`, Number(totalOrdersCount))
  
    } catch (error) {
      logger.error('service', 'service error: setGoodsStockSellingDataToRedis', { error })
      
      throw error
    }
  }

}

module.exports = new GoodsService()