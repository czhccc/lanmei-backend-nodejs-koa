const connection = require('../app/database')

const generateDatetimeId = require('../utils/genarateDatetimeId')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const escapeLike = require('../utils/escapeLike')

const determineMediaFileType = require('../utils/determineMediaFileType')

const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config');

const wechatService = require('./wechat.service');

const redisUtils = require('../utils/redisUtils')

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsCategoryId, goodsRemark='', goodsRichText='<p>暂无更多介绍</p>' } = params;

    if (!goodsName?.trim()) {
      throw new Error('缺少参数：goodsName')
    }
    if (!goodsUnit?.trim()) {
      throw new Error('缺少参数：goodsUnit')
    }
    if (!goodsCategoryId) {
      throw new Error('缺少参数：goodsCategoryId')
    }
    
    const statement = `
      INSERT goods 
        (goods_name, goods_unit, goods_categoryId, goods_remark, goods_richText) 
        VALUES (?, ?, ?, ?, ?)
    `

    const result = await connection.execute(statement, [
      goodsName, goodsUnit, goodsCategoryId, goodsIsSelling, goodsRemark, goodsRichText
    ]);

    return result[0].insertId
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
    } = params;
    
    if (!goodsId) {
      throw new Error('缺少参数：goodsId')
    }
    if (!goodsName?.trim()) {
      throw new Error('缺少参数：goodsName')
    }
    if (!goodsUnit?.trim()) {
      throw new Error('缺少参数：goodsUnit')
    }
    if (!goodsCategoryId) {
      throw new Error('缺少参数：goodsCategoryId')
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      const [currentGoodsInfoResult] = await conn.execute(`SELECT batch_type FROM goods WHERE id = ? FOR UPDATE`, [goodsId]);
      const currentGoodsInfo = currentGoodsInfoResult[0]
      if (currentGoodsInfo.batch_type) {
        throw new Error('存在当前批次，无法更改商品信息')
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
        const {
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
          batchRemark,
        } = params;
        
        // 校验满减优惠
        if (batchDiscountsPromotion?.length > 0) {
          const quantitySet = new Set();
        
          for (const item of batchDiscountsPromotion) {
            if (item.quantity===null || item.quantity===undefined) {
              throw new Error('优惠策略 数量 未填写完整')
            }
            if (item.quantity < 0) {
              throw new Error('优惠策略 优惠金额 须大于等于 0')
            }
            if (item.discount===null || item.discount===undefined) {
              throw new Error('优惠策略 优惠金额 未填写完整')
            }
            if (item.discount <= 0) {
              throw new Error('优惠策略 优惠金额 须大于 0')
            }
        
            if (quantitySet.has(item.quantity)) {
              throw new Error(`优惠策略中数量 "${item.quantity}" 重复`)
            }
        
            quantitySet.add(item.quantity);
          }
        }

        // 校验额外选项
        let handledBatchExtraOptions = batchExtraOptions || []
        if (batchExtraOptions?.length > 0) { 
          const contentSet = new Set();

          for (const item of batchExtraOptions) {
            if (item.content===null || item.content===undefined || item.content.trim()==='') {
              throw new Error('额外选项 内容 未填写完整')
            }
            if (item.amount===null || item.amount===undefined) {
              throw new Error('额外选项 金额 未填写完整')
            }
            if (item.amount < 0) {
              throw new Error('额外选项 金额 须大于等于 0')
            }

            if (contentSet.has(item.content)) {
              throw new Error(`额外选项 选项内容 "${item.content}" 重复`)
            }
        
            contentSet.add(item.content);
          }

          handledBatchExtraOptions = batchExtraOptions.map((item, index) => {
            return {
              id: index,
              ...item,
            }
          })
        }

        // 校验邮费规则
        if (batchShipProvinces.length === 0) {
          throw new Error('未填写邮费规则')
        }
        for (const province of batchShipProvinces) {
          if (province.freeShippingQuantity === 1) continue; // 1个就包邮

          const validations = [
            { field: 'baseQuantity', content: '首重最大数量' },
            { field: 'basePostage', content: '首重邮费' },
            { field: 'extraQuantity', content: '每续重几件' },
            { field: 'extraPostage', content: '续重单位邮费' },
            { field: 'freeShippingQuantity', content: '包邮数量' }
          ];

          if (province.baseQuantity > province.freeShippingQuantity) {
            throw new Error('包邮数量须大于等于首重最大数量');
          }

          for (const { field, content } of validations) {
            const value = province[field];
            if (value===undefined || value===null) {
              throw new Error(`${province.name} ${content} 未填写`);
            }
            if (value === 0) {
              throw new Error(`${province.name} ${content} 不能为0`);
            }
          }
        }

        let batchStatement = `
          UPDATE goods
            SET batch_startBy=?, batch_no=?, batch_type=?, batch_startTime=?, batch_minQuantity=?, 
                batch_discounts_promotion=?, batch_extraOptions=?, batch_shipProvinces=?, batch_remark=?, 
                batch_preorder_minPrice=?, batch_preorder_maxPrice=?, 
                batch_stock_unitPrice=?, batch_stock_totalQuantity=?, batch_stock_remainingQuantity=?
          WHERE id=?
        `;
        const batchResult = await conn.execute(batchStatement, [
          thePhone, batchNo || generateDatetimeId(), batchType, batchStartTime || dayjs().format('YYYY-MM-DD HH:mm:ss'), batchMinQuantity,
          JSON.stringify(batchDiscountsPromotion||[]), JSON.stringify(handledBatchExtraOptions||[]), JSON.stringify(batchShipProvinces), batchRemark,
          batchPreorderMinPrice || null, batchPreorderMaxPrice || null,
          batchStockUnitPrice || null, batchStockTotalQuantity || null, batchStockTotalQuantity || null,
          goodsId
        ]);
        
      }

      await redisUtils.del(`goodsDetail:${goodsId}`)

      await conn.commit();

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }

  }

  async getGoodsDetailById(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    try {

      let redisData = await redisUtils.get(`goodsDetail:${id}`)
      if (redisData) {
        return redisData
      }

      const [goodsInfo, swiperInfo] = await Promise.all([
        connection.execute(`SELECT * FROM goods WHERE id = ?`, [id]),
        connection.execute(`SELECT * FROM goods_media WHERE goods_id = ? AND useType = 'swiper'`, [id])
      ]);

      if (goodsInfo[0].length === 0) {
        throw new Error('商品不存在');
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

      await redisUtils.set(`goodsDetail:${id}`, goods)

      return goods
    } catch (error) {
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

    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    const [countResult, dataResult] = await Promise.all([
      await connection.execute(`SELECT COUNT(*) as total FROM goods ${whereClause}`, queryParams),
      await connection.execute(`
          SELECT * FROM goods ${whereClause}
          ORDER BY createTime DESC 
          LIMIT ? OFFSET ?
        `, 
        [...queryParams, String(pageSizeInt), String(offset)]
      )
    ])

    return {
      total: countResult[0][0].total,
      records: dataResult[0].map(item => {
        return {
          ...item,
          goods_richText: item.goods_richText.replaceAll('BASE_URL', BASE_URL),
          goods_coverImage: item.goods_coverImage ? `${BASE_URL}/${item.goods_coverImage}` : null
        }
      }),
    };
  }

  async getGoodsListForWechat(params) {
    const { goodsName, goodsCategoryId } = params;
    
    let redisData = await redisUtils.get(`goodsList:forWechat:CategoryId_${goodsCategoryId}`)
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
      await redisUtils.set(`goodsList:forWechat:CategoryId_${goodsCategoryId}`, theGoodsList)
    }

    return {
      records: theGoodsList
    };
  }

  async endCurrentBatch(params) {
    const { thePhone, goodsId } = params

    if (!thePhone) {
      throw new Error('缺少参数：thePhone');
    }
    if (!goodsId) {
      throw new Error('缺少参数：goodsId');
    }
    
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
        throw new Error('存在未完结订单，无法结束批次');
      }
      if (totalOrdersCount === 0) {
        throw new Error('订单数为0，无法结束批次');
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
          batch_preorder_finalPrice = NULL,
          batch_startTime = NULL,
          batch_startBy = NULL,
          batch_stock_unitPrice = NULL,
          batch_preorder_minPrice = NULL,
          batch_preorder_maxPrice = NULL,
          batch_minQuantity = NULL,
          batch_discounts_promotion = NULL,
          batch_shipProvinces = NULL,
          batch_remark = NULL,
          batch_stock_totalQuantity = NULL,
          batch_stock_remainingQuantity = NULL
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
        shipProvinces: JSON.stringify(batchInfo.batch_shipProvinces || []),
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

      await redisUtils.del(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.del('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.del(`goodsDetail:${batchInfo.id}`)

      await conn.commit();
      
      wechatService.cleanRecommendList()

      return 'success'
    } catch (error) {
      console.log(error)
      await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }

  }

  async changeGoodsIsSelling(params) {
    const { id, value } = params

    if (!id) throw new Error('缺少参数：id')
    if (typeof value === 'undefined') throw new Error('缺少参数：value');
    if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
      throw new Error('无效的上架状态值（必须为 0 或 1）');
    }
    
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      const [batchInfoResult] = await connection.execute(`
        SELECT 
          goods_categoryId,
          batch_type, 
          batch_preorder_finalPrice, 
          batch_stock_remainingQuantity 
        FROM goods 
        WHERE id = ? 
        FOR UPDATE
      `, [id])
      if (batchInfoResult.length === 0) {
        throw new Error(`ID为 ${id} 的商品不存在`)
      }
      const batchInfo = batchInfoResult[0]
      if (!batchInfo.batch_type) {
        throw new Error('商品无当前批次')
      }

      if (batchInfo.batch_type==='preorder' && batchInfo.batch_preorder_finalPrice) {
        throw new Error('售卖阶段的预订批次无法上架')
      }
      if (batchInfo.batch_type==='stock' && batchInfo.batch_stock_remainingQuantity <= 0) {
        throw new Error('商品余量为0')
      }

      const updateResult = await connection.execute(
        `UPDATE goods SET goods_isSelling = ? WHERE id = ?`, 
        [value, id]
      )

      await redisUtils.del(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.del('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.del(`goodsDetail:${id}`)

      await conn.commit();

      if (value === 0) { // 下架
        wechatService.cleanRecommendList()
      }

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getHistoryBatchesList(params) {
    const { id, pageNo, pageSize, batchNo, startTime, endTime, status } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    const queryParams = [];
  
    let whereClause = ` WHERE goods_id = ?`
    queryParams.push(id)
  
    if (batchNo) {
      whereClause += ` AND no LIKE ?`
      queryParams.push(`%${escapeLike(batchNo)}%`)
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
    
    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    const [countResult, dataResult] = await Promise.all([
      await connection.execute(`SELECT COUNT(*) as total FROM batch_history ${whereClause}`, queryParams),
      await connection.execute(
        `SELECT * FROM batch_history ${whereClause} LIMIT ? OFFSET ?`, 
        [...queryParams, String(pageSizeInt), String(offset)]
      )
    ])
  
    return {
      total: countResult[0][0].total,
      records: dataResult[0],
    };
  }

  async getBatchTotalInfo(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    const [batchInfoResult] = await connection.execute(
      `SELECT batch_no, batch_type, batch_preorder_finalPrice FROM goods WHERE id=?`, 
      [id]
    )
    if (batchInfoResult.length === 0) {
      throw new Error(`ID为 ${id} 的商品不存在`)
    }
    const batchInfo = batchInfoResult[0]
    if (!batchInfo.batch_type) {
      throw new Error('无当前批次')
    }
    
    if (batchInfo.batch_type === 'preorder') { // 预订
      if (!batchInfo.batch_preorder_finalPrice) { // 预订阶段
        const statisticsStatement = `
          SELECT 
            COUNT(*) AS totalOrdersCount,   -- 总订单数量（reserved 和 canceled 订单数量之和）
            COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reservedOrdersCount,   -- reserved 状态的订单数量
            COUNT(CASE WHEN status = 'canceled' THEN 1 END) AS canceledOrdersCount,   -- canceled 状态的订单数量
            SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity,   -- reserved 状态的 quantity 总和
            SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS canceledQuantity   -- canceled 状态的 quantity 总和
          FROM orders
          WHERE batch_no = ? AND status IN ('reserved', 'canceled')
        `
        const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
        const statisticsInfo = statisticsResult[0][0]

        return {
          totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
          reservedOrdersCount: +statisticsInfo.reservedOrdersCount, // 已预订订单
          canceledOrdersCount: +statisticsInfo.canceledOrdersCount, // 已取消订单
          reservedQuantity: +statisticsInfo.reservedQuantity+statisticsInfo.canceledQuantity, // 已预订量
          canceledQuantity: +statisticsInfo.canceledQuantity, // 已取消量
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
    } else {
      const statisticsStatement = `
        SELECT 
          COUNT(*) AS totalOrdersCount,   -- 总订单数量
          COUNT(CASE WHEN status = 'paid' THEN 1 END) AS paidOrdersCount,   -- paid 状态的订单数量
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completedOrdersCount,   -- completed 状态的订单数量
          COUNT(CASE WHEN status = 'refunded' THEN 1 END) AS refundedOrdersCount,   -- refunded 状态的订单数量
          SUM(CASE WHEN status = 'paid' THEN quantity ELSE 0 END) AS paidQuantity,   -- paid 状态的 quantity 总和
          SUM(CASE WHEN status = 'completed' THEN quantity ELSE 0 END) AS completedQuantity,   -- completed 状态的 quantity 总和
          SUM(CASE WHEN status = 'refunded' THEN quantity ELSE 0 END) AS refundedQuantity   -- refunded 状态的 quantity 总和
        FROM orders
        WHERE batch_no = ? AND status IN ('unpaid', 'paid', 'completed', 'canceled', 'refunded')
      `
      const statisticsResult = await connection.execute(statisticsStatement, [batchInfo.batch_no])
      const statisticsInfo = statisticsResult[0][0]

      return {
        totalOrdersCount: +statisticsInfo.totalOrdersCount, // 全部订单
        reservedQuantity: +statisticsInfo.paidQuantity+statisticsInfo.completedQuantity+statisticsInfo.refundedQuantity, // 已预订量

        paidOrdersCount: +statisticsInfo.paidOrdersCount, // 已付款
        paidQuantity: +statisticsInfo.paidQuantity, // 已付款
        completedOrdersCount: +statisticsInfo.completedOrdersCount, // 已完成
        completedQuantity: +statisticsInfo.completedQuantity, // 已完成
        refundedOrdersCount: +statisticsInfo.refundedOrdersCount, // 已退款
        refundedQuantity: +statisticsInfo.refundedQuantity, // 已退款
      }
    }
  }

  async deleteCurrentBatch(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(
        `SELECT batch_no, goods_categoryId FROM goods WHERE id = ? FOR UPDATE`, 
        [id]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];
      
      if (!batchInfo.batch_no) {
        throw new Error('无当前批次');
      }

      // ====================== 2. 检查是否有订单（事务内查询） ======================
      const [ordersCountResult] = await conn.execute(
        `SELECT 1 FROM orders WHERE batch_no = ? LIMIT 1`, 
        [batchInfo.batch_no]
      );
      if (ordersCountResult.length > 0) {
        throw new Error('当前批次已有订单');
      }

      // ====================== 3. 执行批次删除操作 ======================
      const updateFields = {
        batch_no: null,
        batch_type: null,
        batch_preorder_finalPrice: null,
        batch_startTime: null,
        batch_startBy: null,
        batch_stock_unitPrice: null,
        batch_preorder_minPrice: null,
        batch_preorder_maxPrice: null,
        batch_minQuantity: null,
        batch_discounts_promotion: null,
        batch_shipProvinces: null,
        batch_remark: null,
        batch_stock_totalQuantity: null,
        batch_stock_remainingQuantity: null,
        goods_isSelling: 0,
      };
      
      const setClause = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
      await conn.execute(
        `UPDATE goods SET ${setClause} WHERE id = ?`,
        [...Object.values(updateFields), id]
      );

      await redisUtils.del(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.del('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.del(`goodsDetail:${id}`)

      await conn.commit();

      wechatService.cleanRecommendList()

      return 'success'
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async cancelAllOrdersInCurrentBatch(params) {
    const { thePhone, id, cancelReason } = params;

    if (!cancelReason?.trim()) {
      throw new Error('取消原因不能为空');
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
      const nowTime = dayjs().format('YYYY-MM-DD HH:mm:ss'); // 统一时间戳

      // ====================== 1. 查询商品信息并加锁 ======================
      const [batchInfoResult] = await conn.execute(`
        SELECT 
          goods_categoryId,
          batch_no, batch_type, batch_startTime, batch_startBy,
          batch_preorder_minPrice, batch_preorder_maxPrice, batch_preorder_finalPrice,
          batch_stock_unitPrice, batch_minQuantity, batch_discounts_promotion, batch_shipProvinces,
          batch_remark, goods_name, goods_unit, goods_remark, goods_richText, goods_coverImage
            FROM goods WHERE id = ? 
            FOR UPDATE
        `,
        [id]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];

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
           SUM(CASE WHEN status = 'canceled' THEN quantity ELSE 0 END) AS totalSoldQuantity 
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
           batch_startBy = NULL,
           batch_preorder_minPrice = NULL,
           batch_preorder_maxPrice = NULL,
           batch_minQuantity = NULL,
           batch_discounts_promotion = NULL,
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
        shipProvinces: JSON.stringify(batchInfo.batch_shipProvinces || []),
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

      await redisUtils.del(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.del('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.del(`goodsDetail:${id}`)
  
      await conn.commit();

      wechatService.cleanRecommendList()

      return 'success';
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async preorderBatchIsReadyToSell(params) {
    const { thePhone, goodsId, finalPrice } = params

    if (typeof finalPrice !== 'number' || finalPrice <= 0) {
      throw new Error('最终价格必须为正数');
    }
    if (typeof goodsId !== 'number' || goodsId <= 0) {
      throw new Error('商品ID格式错误');
    }

    const conn = await connection.getConnection();
    try {
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
        throw new Error('商品不存在');
      }
      const batchInfo = batchInfoResult[0];

      if (!batchInfo.batch_no) {
        throw new Error('无当前批次');
      }
      if (batchInfo.batch_type !== 'preorder') {
        throw new Error('当前非预订批次');  // 修正拼写错误：Errpr -> Error
      }
      if (finalPrice<batchInfo.batch_preorder_minPrice || finalPrice>batchInfo.batch_preorder_maxPrice) {
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

      await redisUtils.del(`goodsList:forWechat:CategoryId_${batchInfo.goods_categoryId}`)
      await redisUtils.del('categoryList:forWechat'); // 防止该分类下商品数量变为0的情况
      await redisUtils.del(`goodsDetail:${goodsId}`)

      await conn.commit();

      wechatService.cleanRecommendList()

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = new GoodsService()