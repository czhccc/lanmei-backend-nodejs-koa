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

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsCategoryId, goodsRemark='', goodsRichText='<p>暂无更多介绍</p>' } = params;

    try {
      const result = await connection.execute(`
        INSERT goods 
          (goods_name, goods_unit, goods_categoryId, goods_remark, goods_richText) 
          VALUES (?, ?, ?, ?, ?)
      `, [ goodsName, goodsUnit, goodsCategoryId, goodsRemark, goodsRichText ]);
      
      return {
        goodsId: result[0].insertId
      }      
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
          let preorder_reservedOrdersCount = null
          let preorder_reservedQuantity = null;

          let preorder_validOrdersCount = null;
          let preorder_completedOrdersCount = null;
          if (item.batch_type === 'preorder') {
            if (!item.batch_preorder_finalPrice) { // 预订阶段
              preorder_reservedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:reservedOrdersCount`)
              preorder_reservedQuantity = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_pending:reservedQuantity`)
            } else { // 售卖阶段
              preorder_validOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_selling:validOrdersCount`)
              preorder_completedOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:preorder_selling:completedOrdersCount`)
            }
          }

          let stock_paidOrdersCount = null
          let stock_remainingQuantity = null;
          if (item.batch_type === 'stock') {
            stock_paidOrdersCount = await redisUtils.getWithVersion(`goodsSelling:${item.id}:stock:paidOrdersCount`)
            stock_remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${item.id}:stock:remainingQuantity`);
          }
      
          return {
            ...item,

            batch_preorder_reservedOrdersCount: preorder_reservedOrdersCount,
            batch_preorder_reservedQuantity: preorder_reservedQuantity,

            batch_preorder_validOrdersCount: preorder_validOrdersCount,
            batch_preorder_completedOrdersCount: preorder_completedOrdersCount,

            batch_stock_paidOrdersCount: stock_paidOrdersCount,
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
      const [batchInfoResult] = await conn.execute(`
        SELECT 
          goods_categoryId, goods_name, goods_unit, goods_remark, goods_richText,
          batch_no, batch_type, batch_startTime, batch_startBy, batch_minQuantity, batch_discounts_promotion, batch_extraOptions, goods_coverImage, batch_ship_provinces, batch_extraOptions, 
          batch_preorder_minPrice, batch_preorder_maxPrice, batch_preorder_startSelling_time, batch_preorder_startSelling_by, batch_preorder_finalPrice,
          batch_stock_unitPrice, batch_stock_totalQuantity
        FROM goods WHERE id = ? FOR UPDATE`,
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
      // 优先快速判断是否存在未完成订单（用 LIMIT 1）
      const [unfinishedResult] = await conn.execute(`
          SELECT 1 FROM orders 
          WHERE batch_no = ? 
            AND status IN ('unpaid', 'paid', 'shipped') 
          LIMIT 1
        `,
        [batchInfo.batch_no]
      );
      if (unfinishedResult.length > 0) {
        throw new customError.InvalidLogicError('存在未完结的订单，无法结束批次');
      }

      // 再查询总订单数（只有前一步通过时才执行）
      const [totalResult] = await conn.execute(
        `SELECT COUNT(*) AS totalOrdersCount FROM orders WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      const totalOrdersCount = totalResult[0].totalOrdersCount;

      if (totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('订单数为0，无法结束批次，请直接删除批次');
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

      // ====================== 统计订单信息 ======================
      let ordersStatistic = calculateBatchOrdersStatistics({
        batch_no: batchInfo.batch_no,
        batch_type: batchInfo.batch_type,
        batch_preorder_finalPrice: batchInfo.batch_preorder_finalPrice
      })
      

      // ====================== 插入历史批次记录 ======================
      const historyData = {
        no: batchInfo.batch_no,
        goods_id: goodsId,
        type: batchInfo.batch_type,
        startTime: batchInfo.batch_startTime,
        start_by: batchInfo.batch_startBy,
        endTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        minQuantity: batchInfo.batch_minQuantity,
        discounts_promotion: JSON.stringify(batchInfo.batch_discounts_promotion || []),
        extraOptions: JSON.stringify(batchInfo.batch_extraOptions || []),
        ordersStatistic: JSON.stringify(ordersStatistic),
        totalRevenue,
        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_ship_provinces || []),
        remark: batchInfo.batch_remark || '',
        snapshot_goodsName: batchInfo.goods_name,
        snapshot_goodsUnit: batchInfo.goods_unit,
        snapshot_goodsRemark: batchInfo.goods_remark,
        snapshot_goodsRichText: batchInfo.goods_richText,
        status: 'completed',
        complete_by: thePhone,
        
        preorder_minPrice: batchInfo.batch_preorder_minPrice,
        preorder_maxPrice: batchInfo.batch_preorder_maxPrice,
        preorder_startSelling_time: batchInfo.batch_preorder_startSelling_time,
        preorder_startSelling_by: batchInfo.batch_preorder_startSelling_by,
        preorder_finalPrice: batchInfo.batch_preorder_finalPrice,

        stock_unitPrice: batchInfo.batch_stock_unitPrice,
        stock_totalQuantity: batchInfo.batch_stock_totalQuantity,
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

      if (batchInfo.batch_type==='stock') {
        const stock_remainingQuantity = await redisUtils.getWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)
        if (stock_remainingQuantity <= 0) {
          throw new customError.InvalidLogicError('商品库存为0，无法上架')
        }
      }

      const [updateResult] = await connection.execute(
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
          if (!batchInfo.batch_preorder_finalPrice) {
            this.setGoodsPreorderPendingDataToRedis({
              id,
              batch_type: batchInfo.batch_type,
              batch_no: batchInfo.batch_no,
            })
          } else {
            this.setGoodsPreorderSellingDataToRedis({
              id,
              batch_type: batchInfo.batch_type,
              batch_no: batchInfo.batch_no,
            })
          }
        } else if (batchInfo.batch_type==='stock') {
          this.setGoodsStockDataToRedis({
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

  async getBatchOrdersStatistic(params) {
    const { id } = params

    try {
      const [batchInfoResult] = await connection.execute(`
        SELECT 
          batch_no, 
          batch_type, 
          batch_preorder_finalPrice 
        FROM goods WHERE id=?
        `, [id]
      )
      if (batchInfoResult.length === 0) {
        throw new customError.ResourceNotFoundError(`商品不存在`)
      }
      const batchInfo = batchInfoResult[0]
      if (!batchInfo.batch_type) {
        throw new customError.InvalidLogicError('商品无当前批次')
      }
      
      let ordersStatistic = null

      if (batchInfo.batch_type === 'preorder') {
        if (!batchInfo.batch_preorder_finalPrice) {
          let redisOrdersStatistic = await redisUtils.getSimply(`batchOrdersStatistic:${id}:preorder_pending`)
          if (redisOrdersStatistic) {
            ordersStatistic = JSON.parse(redisOrdersStatistic)
          } else {
            const statisticsStatement = `
              SELECT 
                COUNT(*) AS totalOrdersCount,
                SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,
                COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reservedOrdersCount,
                SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity,
                COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceledOrdersCount
              FROM orders
              WHERE batch_no = ?
            `
            const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
            const statisticsInfo = statisticsResult[0][0]
            
            ordersStatistic = {
              totalOrdersCount: +statisticsInfo.totalOrdersCount,
              reservedQuantity: +statisticsInfo.reservedQuantity,
              reservedOrdersCount: +statisticsInfo.reservedOrdersCount,
              canceledQuantity: +statisticsInfo.canceledQuantity,
              canceledOrdersCount: +statisticsInfo.canceledOrdersCount,
              startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              endTime: dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
            }

            await redisUtils.setSimply(`batchOrdersStatistic:${id}:preorder_pending`, JSON.stringify(ordersStatistic), 60*10)
          }
        } else { // 售卖阶段
          let redisOrdersStatistic = await redisUtils.getSimply(`batchOrdersStatistic:${id}:preorder_selling`)
          if (redisOrdersStatistic) {
            ordersStatistic = JSON.parse(redisOrdersStatistic)
          } else {
            const statisticsStatement = `
              SELECT 
                COUNT(*) AS totalOrdersCount,
                SUM(CASE WHEN status = 'unpaid' THEN quantity ELSE 0 END) AS unpaidQuantity,
                COUNT(CASE WHEN status = 'unpaid' THEN 1 END) AS unpaidOrdersCount,
                SUM(CASE WHEN status = 'closed' THEN quantity ELSE 0 END) AS closedQuantity,
                COUNT(CASE WHEN status = 'closed' THEN 1 END) AS closedOrdersCount,
                SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,
                SUM(CASE WHEN status = 'shipped' THEN quantity ELSE 0 END) AS shippedQuantity,
                COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shippedOrdersCount,
                SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,
                SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity,
                COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount
              FROM orders
              WHERE batch_no = ? AND status IN ('unpaid', 'closed', 'paid', 'shipped', 'completed', 'refunded')
            `
            const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
            const statisticsInfo = statisticsResult[0][0]
            
            ordersStatistic = {
              totalOrdersCount: +statisticsInfo.totalOrdersCount,
              unpaidQuantity: +statisticsInfo.unpaidQuantity,
              unpaidOrdersCount: +statisticsInfo.unpaidOrdersCount,
              closedQuantity: +statisticsInfo.closedQuantity,
              closedOrdersCount: +statisticsInfo.closedOrdersCount,
              paidQuantity: +statisticsInfo.paidQuantity,
              paidOrdersCount: +statisticsInfo.paidOrdersCount,
              shippedQuantity: +statisticsInfo.shippedQuantity,
              shippedOrdersCount: +statisticsInfo.shippedOrdersCount,
              completedQuantity: +statisticsInfo.completedQuantity,
              completedOrdersCount: +statisticsInfo.completedOrdersCount,
              refundedQuantity: +statisticsInfo.refundedQuantity,
              refundedOrdersCount: +statisticsInfo.refundedOrdersCount,
              startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              endTime: dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
            }

            await redisUtils.setSimply(`batchOrdersStatistic:${id}:preorder_selling`, JSON.stringify(ordersStatistic), 60*10)
          }
        }
      } else if (batchInfo.batch_type === 'stock') {
        let redisOrdersStatistic = await redisUtils.getSimply(`batchOrdersStatistic:${id}:stock`)
        if (redisOrdersStatistic) {
          ordersStatistic = JSON.parse(redisOrdersStatistic)
        } else {
          const statisticsStatement = `
            SELECT 
              COUNT(*) AS totalOrdersCount,
              SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,
              COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,
              SUM(CASE WHEN status = 'shipped' THEN quantity ELSE 0 END) AS shippedQuantity,
              COUNT(CASE WHEN status = 'shipped' THEN 1 END) AS shippedOrdersCount,
              SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,
              COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,
              SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity,
              COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount
            FROM orders
            WHERE batch_no = ?
          `
          const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
          const statisticsInfo = statisticsResult[0][0]
          
          ordersStatistic = {
            totalOrdersCount: +statisticsInfo.totalOrdersCount,
            paidQuantity: +statisticsInfo.paidQuantity,
            paidOrdersCount: +statisticsInfo.paidOrdersCount,
            shippedQuantity: +statisticsInfo.shippedQuantity,
            shippedOrdersCount: +statisticsInfo.shippedOrdersCount,
            completedQuantity: +statisticsInfo.completedQuantity,
            completedOrdersCount: +statisticsInfo.completedOrdersCount,
            refundedQuantity: +statisticsInfo.refundedQuantity,
            refundedOrdersCount: +statisticsInfo.refundedOrdersCount,
            startTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
            endTime: dayjs().add(10, 'minute').format('YYYY-MM-DD HH:mm:ss'),
          }

          await redisUtils.setSimply(`batchOrdersStatistic:${id}:stock`, JSON.stringify(ordersStatistic), 60*10)
        }
      }

      return ordersStatistic
    } catch (error) {
      logger.error('service', 'service error: getBatchOrdersStatistic', { error })
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
          goods_categoryId, goods_name, goods_unit, goods_remark, goods_richText, 
          batch_no, batch_type, batch_startTime, batch_startBy,
          batch_minQuantity, batch_discounts_promotion, batch_extraOptions, goods_coverImage, batch_ship_provinces, batch_remark, 
          batch_preorder_minPrice, batch_preorder_maxPrice
            FROM goods WHERE id = ? FOR UPDATE
      `, [id]);
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
           COUNT(*) AS totalOrdersCount 
         FROM orders 
         WHERE batch_no = ?`,
        [batchInfo.batch_no]
      );
      
      if (ordersInfoResult[0].totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('当前批次无订单')
      }
      
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

      // ====================== 统计订单信息 ======================
      let ordersStatistic = calculateBatchOrdersStatistics({
        batch_no: batchInfo.batch_no,
        batch_type: batchInfo.batch_type,
        batch_preorder_finalPrice: batchInfo.batch_preorder_finalPrice
      })
      
      // ====================== 插入历史批次记录 ======================
      const historyData = {
        no: batchInfo.batch_no,
        goods_id: id,
        type: batchInfo.batch_type,
        startTime: batchInfo.batch_startTime,
        start_by: batchInfo.batch_startBy,
        endTime: nowTime,
        minQuantity: batchInfo.batch_minQuantity,
        discounts_promotion: JSON.stringify(batchInfo.batch_discounts_promotion || []),
        extraOptions: JSON.stringify(batchInfo.batch_extraOptions || []),
        ordersStatistic: JSON.stringify(ordersStatistic),

        coverImage: batchInfo.goods_coverImage || '',
        shipProvinces: JSON.stringify(batchInfo.batch_ship_provinces || []),
        remark: batchInfo.batch_remark || '',
        status: 'canceled',
        snapshot_goodsName: batchInfo.goods_name,
        snapshot_goodsUnit: batchInfo.goods_unit,
        snapshot_goodsRemark: batchInfo.goods_remark,
        snapshot_goodsRichText: batchInfo.goods_richText,
        cancel_reason: cancelReason,
        cancel_by: thePhone,
        
        preorder_minPrice: batchInfo.batch_preorder_minPrice,
        preorder_maxPrice: batchInfo.batch_preorder_maxPrice,
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
      const [batchInfoResult] = await conn.execute(`
        SELECT 
          goods_categoryId,
          batch_no, batch_type, 
          batch_preorder_minPrice, batch_preorder_maxPrice 
            FROM goods WHERE id = ? 
            FOR UPDATE
        `,[goodsId]
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
      const [ordersCountInfoResult] = await conn.execute(`
        SELECT
          COUNT(*) AS totalOrdersCount,
          SUM(CASE WHEN status IN ('unpaid', 'closed', 'paid', 'shipped', 'completed', 'refunded') THEN quantity ELSE 0 END) AS totalReservedQuantity,
          COUNT(CASE WHEN status IN ('unpaid', 'closed', 'paid', 'shipped', 'completed', 'refunded') THEN 1 ELSE NULL END) AS totalReservedOrdersCount,
        FROM orders
        WHERE batch_no = ?
      `, [batchInfo.batch_no]);
      const ordersCountInfo = ordersCountInfoResult[0]
      if (ordersCountInfo.totalOrdersCount === 0) {
        throw new customError.InvalidLogicError('当前批次无订单')
      }

      // ====================== 更新批次最终价格 ======================
      let nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
      await conn.execute(`
          UPDATE goods 
            SET 
              batch_preorder_startSelling_time = ?, 
              batch_preorder_startSelling_by = ?, 
              batch_preorder_finalPrice = ?,
              batch_preorder_totalReservedQuantity = ?,
              batch_preorder_totalReservedOrdersCount = ?
          WHERE id = ?
        `, [nowTime, thePhone, finalPrice, Number(ordersCountInfo.totalReservedQuantity), Number(ordersCountInfo.totalReservedOrdersCount), goodsId]
      );

      // ====================== 批量更新订单状态 ======================
      const [updateResult] = await conn.execute(`
          UPDATE orders 
            SET status = 'unpaid', preorder_startSelling_time = ?, preorder_startSelling_by = ?, preorder_finalPrice = ? 
          WHERE 
            batch_no = ? AND status = 'reserved'
        `, [nowTime, thePhone, finalPrice, batchInfo.batch_no]
      );

      await redisUtils.delWithVersion(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.delWithVersion('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.delWithVersion(`goodsDetail:${goodsId}`)

      await conn.commit();

      await this.cleanUselessGoodsDataAfterNotSelling({
        id: goodsId,
        batch_type: batchInfo.batch_type,
      })

      await this.setGoodsPreorderSellingDataToRedis({
        id: goodsId,
        batch_type: batchInfo.batch_type,
        batch_no: batchInfo.batch_no,
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
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`)

      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_selling:finishedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:preorder_selling:finishedOrdersCount`)
    } else if (batch_type === 'stock') {
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:remainingQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:finishedQuantity`)
      redisUtils.delWithVersion(`goodsSelling:${id}:stock:finishedOrdersCount`)
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

      const [result] = await connection.execute(`
        SELECT
          COUNT(CASE WHEN status = 'reserved' THEN 1 ELSE NULL END) AS reservedOrdersCount,
          SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity
        FROM orders
        WHERE batch_no = ?
      `, [batch_no]);
  
      const {
        reservedOrdersCount = 0,
        reservedQuantity = 0,
      } = result[0] || {};
  
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`, Number(reservedOrdersCount))
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`, Number(reservedQuantity))

    } catch (error) {
      logger.error('service', 'service error: setGoodsPreorderPendingDataToRedis', { error })
      
      throw error
    }
  }

  async setGoodsPreorderSellingDataToRedis(params) {
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

      const [result] = await connection.execute(`
        SELECT
          SUM(CASE WHEN status IN ('completed', 'closed', 'refunded') THEN quantity ELSE 0 END) AS finishedQuantity,
          COUNT(CASE WHEN status IN ('completed', 'closed', 'refunded') THEN 1 ELSE NULL END) AS finishedOrdersCount,
        FROM orders
        WHERE batch_no = ?
      `, [batch_no]);
  
      const {
        finishedQuantity = 0,
        finishedOrdersCount = 0,
      } = result[0] || {};
  
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_selling:finishedQuantity`, Number(finishedQuantity))
      await redisUtils.setWithVersion(`goodsSelling:${id}:preorder_selling:finishedOrdersCount`, Number(finishedOrdersCount))

    } catch (error) {
      logger.error('service', 'service error: setGoodsPreorderSellingDataToRedis', { error })
      
      throw error
    }
  }

  async setGoodsStockDataToRedis(params) {
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

      const [result] = await connection.execute(`
        SELECT
          SUM(CASE WHEN status IN ('paid', 'shipped', 'completed', 'refunded') THEN quantity ELSE 0 END) AS consumedQuantity,
          COUNT(CASE WHEN status IN ('paid', 'shipped', 'completed', 'refunded') THEN 1 ELSE NULL END) AS totalOrdersCount,
          SUM(CASE WHEN status IN ('completed', 'refunded') THEN quantity ELSE 0 END) AS finishedQuantity,
          COUNT(CASE WHEN status IN ('completed', 'refunded') THEN 1 ELSE NULL END) AS finishedOrdersCount 
        FROM orders
        WHERE batch_no = ?
      `, [batch_no]);
  
      const {
        consumedQuantity = 0,
        totalOrdersCount = 0,
        finishedQuantity = 0,
        finishedOrdersCount = 0,
      } = result[0] || {};
  
      const remainingQuantity = Number(batch_stock_totalQuantity) - Number(consumedQuantity)
  
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:remainingQuantity`, Number(remainingQuantity))
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`, Number(totalOrdersCount))
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:finishedQuantity`, Number(finishedQuantity))
      await redisUtils.setWithVersion(`goodsSelling:${id}:stock:finishedOrdersCount`, Number(finishedOrdersCount))
  
    } catch (error) {
      logger.error('service', 'service error: setGoodsStockDataToRedis', { error })
      
      throw error
    }
  }

  async calculateBatchOrdersStatistics(params) {
    const { batch_no, batch_type, batch_preorder_finalPrice } = params

    try {
      if (!batch_no) {
        throw new customError.MissingParameterError('batch_no')
      }
      if (!batch_type) {
        throw new customError.MissingParameterError('batch_type')
      }

      const commonFields = `
        COUNT(CASE WHEN status = 'completed' THEN 1 ELSE NULL END) AS completedOrdersCount,
        SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,
        COUNT(CASE WHEN status = 'refunded' THEN 1 ELSE NULL END) AS refundedOrdersCount,
        SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity
      `;
      const preorderExtraFields = ``

      if (batch_type==='preorder') {
        if (!batch_preorder_finalPrice) {
          preorderExtraFields = `
            COUNT(CASE WHEN status = 'reserved' THEN 1 ELSE NULL END) AS reservedOrdersCount,
            SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,
            COUNT(CASE WHEN status = 'canceled' THEN 1 ELSE NULL END) AS canceledOrdersCount,
            SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity
          `
        } else {
          preorderExtraFields = `
            COUNT(CASE WHEN status = 'canceled' THEN 1 ELSE NULL END) AS canceledOrdersCount,
            SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity,
            COUNT(CASE WHEN status = 'unpaid' THEN 1 ELSE NULL END) AS unpaidOrdersCount,
            SUM(CASE WHEN status = 'unpaid' THEN quantity ELSE 0 END) AS unpaidQuantity,
            COUNT(CASE WHEN status = 'closed' THEN 1 ELSE NULL END) AS closedOrdersCount,
            SUM(CASE WHEN status = 'closed' THEN quantity ELSE 0 END) AS closedQuantity
          `
        }
      }

      const ordersStatisticSelect = `
        SELECT
          ${batch_type === 'preorder' ? preorderExtraFields : ''}
          ${commonFields}
        FROM orders 
        WHERE batch_no = ?
      `;
      
      const [ordersStatisticResult] = await connection.execute(ordersStatisticSelect, [batch_no]);
      const item = ordersStatisticResult[0] || {};

      const ordersStatistic = {
        completedOrdersCount: item.completedOrdersCount || 0,
        completedQuantity: item.completedQuantity || 0,
        refundedOrdersCount: item.refundedOrdersCount || 0,
        refundedQuantity: item.refundedQuantity || 0,
      }

      if (batch_type === 'preorder') {
        if (!batch_preorder_finalPrice) {
          ordersStatistic.reservedOrdersCount = item.reservedOrdersCount || 0
          ordersStatistic.reservedQuantity = item.reservedQuantity || 0
          ordersStatistic.canceledOrdersCount = item.canceledOrdersCount || 0
          ordersStatistic.canceledQuantity = item.canceledQuantity || 0
        } else {
          ordersStatistic.canceledOrdersCount = item.canceledOrdersCount || 0
          ordersStatistic.canceledQuantity = item.canceledQuantity || 0
          ordersStatistic.unpaidOrdersCount = item.unpaidOrdersCount || 0
          ordersStatistic.unpaidQuantity = item.unpaidQuantity || 0
          ordersStatistic.closedOrdersCount = item.closedOrdersCount || 0
          ordersStatistic.closedQuantity = item.closedQuantity || 0
        }
      }

      return ordersStatistic;
    } catch (error) {
      logger.error('service', 'service error: calculateBatchOrdersStatistics', { error })
      
      throw error
    }
  }
}

module.exports = new GoodsService()