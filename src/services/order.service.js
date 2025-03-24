const connection = require('../app/database')

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config')

class OrderService {
  async createOrder(params) {
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();
  
      const {
        goods_id, quantity, 
        receive_isHomeDelivery, receive_name, receive_phone, 
        receive_provinceCode, receive_cityCode, receive_districtCode, receive_address, 
        remark_customer,
        remark_self = ''
      } = params;

      if (!goods_id) {
        throw new Error('缺少参数：id')
      }
      if (!(Number.isInteger(quantity) && quantity>0)) {
        throw new Error('商品数量必须为正整数')
      }
      if (!receive_provinceCode || !receive_cityCode || !receive_districtCode || !receive_address.trim() || !receive_name || !receive_phone) {
        throw new Error('收货地址信息不完整')
      }
  
      // ====================== 获取商品信息 ======================
      const [batchInfoResult] = await conn.execute(`
        SELECT  
          id, batch_no, batch_type, goods_isSelling,
          batch_shipProvinces, batch_preorder_minPrice, batch_preorder_maxPrice,
          batch_stock_remainingQuantity, batch_stock_unitPrice,
          goods_coverImage, goods_name, goods_unit, goods_remark, goods_richText
        FROM goods WHERE id = ? FOR UPDATE`,
        [goods_id]
      );
      if (batchInfoResult.length === 0) {
        throw new Error('商品不存在')
      }
      const batchInfo = batchInfoResult[0];
      if (!batch_type.batch_type) {
        throw new Error('商品已下架');
      }
      if (batchInfo.goods_isSelling !== 1) {
        throw new Error('商品已下架');
      }

      // 省市区信息
      const [areas] = await conn.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          addressParams.provinceCode, addressParams.cityCode, addressParams.districtCode,
          addressParams.provinceCode, addressParams.cityCode, addressParams.districtCode
        ]
      );
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;

      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');

      const shipProvincesCodes = batchInfo.batch_shipProvinces.map(item => item.code);
      if (!shipProvincesCodes.includes(receive_provinceCode)) {
        throw new Error('所选省份暂不支持配送');
      }
      if (receive_isHomeDelivery && districtInfo.name !== '嵊州市') {
        throw new Error('只有嵊州市可以送货上门');
      }

      // ====================== 按批次类型处理 ======================
      if (batchInfo.batch_type === 'preorder') {

      } else if (batchInfo.batch_type === 'stock') {
        const [updateResult] = await conn.execute(
          `UPDATE goods 
           SET 
             batch_stock_remainingQuantity = batch_stock_remainingQuantity - ?, 
             goods_isSelling = CASE 
               WHEN (batch_stock_remainingQuantity - ?) <= 0 THEN 0 
               ELSE goods_isSelling 
             END 
           WHERE 
             id = ? 
              AND batch_stock_remainingQuantity >= ? 
              AND goods_isSelling = 1`,
          [quantity, quantity, goods_id, quantity]
        );
  
        if (updateResult.affectedRows === 0) {
          if (Number(batchInfo.batch_stock_remainingQuantity) === 0) {
            throw new Error('商品余量为0')
          }
          if (Number(batchInfo.batch_stock_remainingQuantity) < quantity) {
            throw new Error('商品余量不足');
          }
        }
      }
  
      // ====================== 生成订单 ======================
      // 计算邮费
      let postage = null
      let postageRule = batchInfo.batch_shipProvinces.find(item => item.code === receive_provinceCode)
      if (!postageRule) {
        throw new Error('当前省份无有效邮费规则');
      }
      if (postageRule.freeShippingQuantity && quantity>=postageRule.freeShippingQuantity) { // 达到包邮条件
        postage = 0
      } else {
        if (quantity <= postageRule.baseQuantity) { // 首重之内
          postage = postageRule.basePostage
        }
        if ((quantity>postageRule.baseQuantity) && (quantity<postageRule.freeShippingQuantity)) { // 大于首重
          let excess = quantity - postageRule.baseQuantity; // 超出首重的数量
          let extraChargeUnits = Math.ceil(excess / postageRule.extraQuantity); // 向上取整计算需要支付的超额邮费次数
          postage = postageRule.basePostage + extraChargeUnits * postageRule.extraPostage
        }
      }
      if (postage < 0 ) {
        throw new Error('邮费计算异常');
      }
      
      // 计算满减优惠
      const discountAmountPromotion = batchInfo.batch_discounts
                                        .filter(d => quantity >= d.quantity)
                                        .reduce((max, d) => Math.max(max, d.discount), 0);

      // 生成订单号
      const getRandomLetters = (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      };
      const orderNo = `${dayjs().format('YYYYMMDDHHmmss')}${params.thePhone.slice(-4)}${getRandomLetters(2)}`;

      const orderBaseFields = {
        goods_id,
        create_by: params.thePhone,
        order_no: orderNo,
        batch_no: batchInfo.batch_no,
        batch_type: batchInfo.batch_type,
        quantity: Number(quantity),
        receive_isHomeDelivery: receive_isHomeDelivery || 0,
        receive_name,
        receive_phone,
        receive_province: provinceInfo.name, 
        receive_provinceCode, 
        receive_city: cityInfo.name, 
        receive_cityCode, 
        receive_district: districtInfo.name, 
        receive_districtCode, 
        receive_address,
        remark_customer,
        discountAmount_promotion: Number(discountAmountPromotion),
        postage: Number(postage),
        snapshot_coverImage: batchInfo.goods_coverImage, 
        snapshot_goodsName: batchInfo.goods_name, 
        snapshot_goodsUnit: batchInfo.goods_unit, 
        snapshot_goodsRemark: batchInfo.goods_remark, 
        snapshot_goodsRichText: (batchInfo.goods_richText || '').replaceAll(BASE_URL, 'BASE_URL'), 
        snapshot_discounts: batchInfo.batch_discounts,
        remark_self,
      };
      
      // 根据订单类型动态添加字段
      let orderFields;
      if (batchInfo.batch_type === 'preorder') {
        orderFields = {
          ...orderBaseFields,
          preorder_minPrice: Number(batchInfo.batch_preorder_minPrice || 0),
          preorder_maxPrice: Number(batchInfo.batch_preorder_maxPrice || 0),
          preorder_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'reserved',
        };
      } else if (batchInfo.batch_type === 'stock') {
        // 计算商品总价
        let goodsTotalPrice = Number(batchInfo.batch_stock_unitPrice) * Number(quantity)

        if (discountAmountPromotion < 0 || discountAmountPromotion > goodsTotalPrice) {
          throw new Error('优惠金额异常');
        }
        
        const finalAmount = goodsTotalPrice + postage - discountAmountPromotion
        orderFields = {
          ...orderBaseFields,
          stock_unitPrice: Number(batchInfo.batch_stock_unitPrice),
          pay_finalAmount: finalAmount,
          pay_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'paid',
        };
      }

      // 插入订单
      const insertColumns = Object.keys(orderFields).join(', ');
      const insertPlaceholders = Object.keys(orderFields).map(() => '?').join(', ');
      const insertStatement = `
        INSERT INTO orders (${insertColumns}) 
        VALUES (${insertPlaceholders})
      `;
      const [insertResult] = await conn.execute(insertStatement, Object.values(orderFields));
  
      await conn.commit();

      return { 
        id: insertResult.insertId 
      };
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async updateOrder(params) {
    if (!params.id) {
      throw new Error('缺少参数：id')
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      // 允许修改的字段白名单
      const allowedFields = new Set([
        'remark_self', 
        'receive_name', 
        'receive_phone',
        'receive_provinceCode', 
        'receive_cityCode', 
        'receive_districtCode',
        'receive_address', 
        'receive_isHomeDelivery'
      ]);

      // ------------ 阶段1：数据准备 ------------
      const [orderResult] = await conn.execute(
        `SELECT ${Array.from(allowedFields).join(', ')} FROM orders WHERE id = ? FOR UPDATE`,
        [params.id]
      );
      if (orderResult.length === 0) throw new Error('订单不存在');
      const originalOrder = orderResult[0];

      // ------------ 阶段2：构建更新数据 ------------
      const updateData = {};
      let hasChanges = false;
      for (const key in params) {
        if (allowedFields.has(key) && originalOrder[key] !== params[key]) {
          updateData[key] = params[key];
          hasChanges = true;
        }
      }
      if (!hasChanges) {
        return '未检测到有效修改'
      }

      // ------------ 阶段3：地址验证逻辑 ------------
      // 获取最新地址参数（优先使用新值）
      const addressParams = {
        provinceCode: updateData.receive_provinceCode || originalOrder.receive_provinceCode,
        cityCode: updateData.receive_cityCode || originalOrder.receive_cityCode,
        districtCode: updateData.receive_districtCode || originalOrder.receive_districtCode,
        isHomeDelivery: updateData.receive_isHomeDelivery ?? originalOrder.receive_isHomeDelivery
      };

      // 查询地址信息
      const [areas] = await conn.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          addressParams.provinceCode, addressParams.cityCode, addressParams.districtCode,
          addressParams.provinceCode, addressParams.cityCode, addressParams.districtCode
        ]
      );
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;

      // 层级验证
      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');

      // 检查配送范围
      const [goodsResult] = await conn.execute(
        `SELECT batch_shipProvinces FROM goods WHERE id = ?`,
        [originalOrder.goods_id]
      );
      const shipProvinces = goodsResult[0].batch_shipProvinces || '[]';
      if (!shipProvinces.some(item => item.code === province.code)) {
        throw new Error('当前省份不支持配送');
      }
      if (addressParams.isHomeDelivery && district.name !== '嵊州市') {
        throw new Error('仅嵊州市支持送货上门');
      }

      if (updateData.receive_provinceCode) {
        updateData.receive_province = province.name
      }
      if (updateData.receive_cityCode) {
        updateData.receive_city = city.name
      }
      if (updateData.receive_districtCode) {
        updateData.receive_district = district.name
      }
      
      // ------------ 阶段4：记录变更日志 ------------
      const changes = {};
      for (const key in updateData) {
        changes[key] = {
          old: originalOrder[key],
          new: updateData[key]
        };
      }
      await conn.execute(
        `INSERT INTO orders_logs (order_id, order_no, changes, create_by) VALUES (?, ?, ?, ?)`,
        [originalOrder.id, originalOrder.order_no, JSON.stringify(changes), params.thePhone]
      );
      
      // ------------ 阶段5：执行更新 ------------
      const setClause = Object.keys(updateData).map(key => `\`${key}\` = ?`).join(', ');
      const updateValues = [...Object.values(updateData), originalOrder.id];
      
      await conn.execute(
        `UPDATE orders SET ${setClause} WHERE id = ?`,
        updateValues
      );

      await conn.commit();
      return changes;
    } catch (error) {
      await conn.rollback();
      console.log(error);
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async getOrderList(params) {
    const { pageNo, pageSize } = params;

    let query = ' WHERE 1=1'
    let queryParams = []

    if (params.create_by) {
      query += ` AND create_by LIKE ?`
      queryParams.push(`%${escapeLike(params.create_by)}%`)
    }
    if (params.batch_type) {
      query += ` AND batch_type = ?`
      queryParams.push(params.batch_type)
    }
    if (params.order_no) {
      query += ` AND order_no LIKE ?`
      queryParams.push(`%${escapeLike(params.order_no)}%`)
    }
    if (params.batch_no) {
      query += ` AND batch_no LIKE ?`
      queryParams.push(`%${escapeLike(params.batch_no)}%`)
    }
    if (params.snapshot_goodsName) {
      query += ` AND snapshot_goodsName LIKE ?`
      queryParams.push(`%${escapeLike(params.snapshot_goodsName)}%`)
    }
    if (params.status) {
      query += ` AND status = ?`
      queryParams.push(params.status)
    }
    if (params.startTime || params.endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    const [totalResult, dataResult] = await Promise.all([
      connection.execute(`
        SELECT COUNT(*) as total FROM orders ${query}
      `, queryParams),
      connection.execute(`
        SELECT * from orders ${query} 
          ORDER BY createTime DESC 
            LIMIT ? OFFSET ?
      `, [...queryParams, String(pageSizeInt), String(offset)])
    ]);

    return {
      total: totalResult[0][0].total,  // 总记录数
      records: dataResult[0].map(item => {
        return {
          ...item,
          snapshot_coverImage: `${BASE_URL}/${item.snapshot_coverImage}`
        }
      })
    };
  }

  async getOrderDetailById(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    const conn = await connection.getConnection();
    try {
      const [orderDetailResult] = await conn.execute(`
        SELECT * FROM orders WHERE id = ? FOR UPDATE
      `, [id]);

      if (orderDetailResult.length === 0) {
        throw new Error('订单不存在')
      }

      const orderDetail = orderDetailResult[0]
      
      return {
        ...orderDetail,
        snapshot_coverImage: `${BASE_URL}/${orderDetail.snapshot_coverImage}`,
        snapshot_goodsRichText: orderDetail.snapshot_goodsRichText.replaceAll('BASE_URL', BASE_URL),
      }
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      if (conn) conn.release();
    }
  }

  async cancelOrder(params) {
    let { orderId, cancelOrderReason=null, thePhone } = params
    
    if (!orderId) {
      throw new Error('缺少参数：orderId')
    }

    try {
      await connection.beginTransaction();

      const [cancelReservedOrderResult] = await connection.execute(`
        UPDATE orders 
          SET status = 'canceled', cancel_reason = ?, cancel_time = ?, cancel_by = ?
        WHERE id = ?
      `, [
        cancelOrderReason, dayjs().format('YYYY-MM-DD HH:mm:ss'), thePhone, orderId
      ]);
      if (cancelReservedOrderResult.affectedRows === 0) {
        const [orderDetailResult] = await connection.execute(`
          SELECT status FROM orders WHERE id = ? LIMIT 1
        `, [orderId]);
        if (orderDetailResult.length === 0) {
          throw new Error('订单不存在')
        }
        const orderInfo = orderDetailResult[0]
        if (orderInfo.status !== 'reserved') {
          throw new Error('此订单非预订状态，无法取消预订')
        }
      }

      await connection.commit();
      
      return 'success'
    } catch (error) {
      throw error
    }
  }

  async getOrdersLogsList(params) {
    const { pageNo, pageSize } = params;

    let query = ' WHERE 1=1'
    let queryParams = []

    if (params.order_id) {
      query += ` AND order_id LIKE ?`
      queryParams.push(`%${escapeLike(params.order_id)}%`)
    }
    if (params.order_no) {
      query += ` AND order_no LIKE ?`
      queryParams.push(`%${escapeLike(params.order_no)}%`)
    }
    if (params.create_by) {
      query += ` AND create_by LIKE ?`
      queryParams.push(`%${escapeLike(params.create_by)}%`)
    }
    if (params.startTime || params.endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    try {
      const [totalResult, dataResult] = await Promise.all([
        connection.execute(`
          SELECT COUNT(*) as total FROM orders_logs ${query}
        `, queryParams),
        connection.execute(`
          SELECT * from orders_logs ${query} 
            ORDER BY createTime DESC 
              LIMIT ? OFFSET ?
        `, [...queryParams, String(pageSizeInt), String(offset)])
      ]);

      return {
        total: totalResult[0][0].total,
        records: dataResult[0]
      };
    } catch (error) {
      throw error
    }
  }

  async payOrder(params) {
    const { orderId } = params

    if (!orderId) {
      throw new Error('缺少参数：orderId');
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      const [getOrderInfoResult] = await conn.execute(
        `SELECT 
          status, goods_id, receive_provinceCode, quantity, batch_type,
         FROM orders WHERE id = ? FOR UPDATE`,
        [orderId]
      );

      if (getOrderInfoResult.length === 0) {
        throw new Error('订单不存在');
      }

      const orderInfo = getOrderInfoResult[0]

      if (orderInfo.status !== 'unpaid') {
        throw new Error('订单不是未付款状态');
      }

      // ------------------------------------------------------
      const batchInfoResult = await conn.execute(
        `SELECT 
          batch_shipProvinces, batch_discounts, batch_preorder_finalPrice, batch_stock_unitPrice
          FROM goods WHERE id = ? FOR UPDATE`,
        [orderInfo.goods_id]
      );
      const batchInfo = batchInfoResult[0][0];

      // 计算邮费
      let postage = null
      let postageRule = batchInfo.batch_shipProvinces.find(item => item.code === orderInfo.receive_provinceCode)
      if (!postageRule) {
        throw new Error('当前省份无有效邮费规则');
      }
      if (postageRule.freeShippingQuantity && orderInfo.quantity>=postageRule.freeShippingQuantity) { // 达到包邮条件
        postage = 0
      } else {
        if (orderInfo.quantity <= postageRule.baseQuantity) { // 首重之内
          postage = postageRule.basePostage
        }
        if ((orderInfo.quantity>postageRule.baseQuantity) && (orderInfo.quantity<postageRule.freeShippingQuantity)) { // 大于首重
          let excess = orderInfo.quantity - postageRule.baseQuantity; // 超出首重的数量
          let extraChargeUnits = Math.ceil(excess / postageRule.extraQuantity); // 向上取整计算需要支付的超额邮费次数
          postage = postageRule.basePostage + extraChargeUnits * postageRule.extraPostage
        }
      }
      if (postage < 0 ) {
        throw new Error('邮费计算异常');
      }

      // 计算满减优惠
      let discountAmountPromotion = 0;
      batchInfo.batch_discounts.forEach(item => {
        if (orderInfo.quantity >= item.quantity) {
          discountAmountPromotion = Math.max(discountAmountPromotion, item.discount);
        }
      })

      // 计算商品总价
      let goodsTotalPrice = null
      let finalAmount = null
      if (orderInfo.batch_type === 'preorder') {
        goodsTotalPrice = Number(batchInfo.batch_preorder_finalPrice) * Number(orderInfo.quantity)

        finalAmount = goodsTotalPrice + postage - discountAmountPromotion
      } else if (orderInfo.batch_type === 'stock') {
        goodsTotalPrice = Number(batchInfo.batch_stock_unitPrice) * Number(orderInfo.quantity)

        finalAmount = goodsTotalPrice + postage - discountAmountPromotion
      }

      const payOrderStatement = `
        UPDATE orders 
        SET 
          status = 'paid',
          pay_finalAmount = ?,
          pay_time = ?
        WHERE 
          id = ? 
          AND status = 'unpaid'
      `;
      const payOrderResult = await conn.execute(payOrderStatement, [
        finalAmount, dayjs().format('YYYY-MM-DD HH:mm:ss'), orderId
      ]);

      await conn.commit();
      return 'success';
    } catch (error) {
      console.log(error);
      await conn.rollback();

      throw error
    } finally {
      if (conn) conn.release();
    }

  }

  async completeOrder(params) {
    const { orderId, thePhone } = params

    if (!orderId) {
      throw new Error('缺少参数：orderId');
    }

    try {
      await connection.beginTransaction();

      const [completeOrderResult] = await connection.execute(`
        UPDATE orders 
        SET 
          status = 'completed',
          complete_time = ?,
          complete_by = ?
        WHERE 
          id = ? 
          AND status = 'paid'
      `, [
        dayjs().format('YYYY-MM-DD HH:mm:ss'), thePhone, orderId
      ]);

      if (completeOrderResult.affectedRows === 0) {
        const [getOrderInfoResult] = await connection.execute(
          'SELECT status FROM orders WHERE id = ?',
          [orderId]
        );
  
        if (getOrderInfoResult.length === 0) {
          throw new Error('订单不存在');
        }
  
        const orderInfo = getOrderInfoResult[0]
  
        if (orderInfo.status !== 'paid') {
          throw new Error('订单不是已付款状态');
        }

        throw new Error('操作失败，请联系管理员')
      }

      return 'success';
    } catch (error) {
      throw error
    }
  }

  async generateOrderInfo(params) {
    const { goodsId, quantity, provinceCode } = params

    if (!goodsId) {
      throw new Error('缺少参数：goodsId')
    }
    if (!quantity) {
      throw new Error('缺少参数：quantity')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }

    try {
      const [goodsResult] = await connection.execute(
        `SELECT 
          batch_type,
          goods_isSelling,
          batch_stock_remainingQuantity,
          batch_preorder_minPrice,
          batch_preorder_maxPrice,
          batch_stock_unitPrice,
          batch_discounts,
          batch_shipProvinces
        FROM goods WHERE id = ?`,
        [goodsId]
      );
      const goods = goodsResult[0];
      
      if (goodsResult.length === 0) {
        throw new Error('商品不存在');
      }
      if (goods.goods_isSelling === 0) {
        throw new Error('商品已下架');
      }
      if (goods.batch_type === 'stock' && goods.batch_stock_remainingQuantity < quantity) {
        throw new Error('库存不足');
      }

      // 计算商品总价
      let goodsTotalPrice = {}
      if (goods.batch_type === 'preorder') {
        goodsTotalPrice.minPrice = goods.batch_preorder_minPrice * quantity,
        goodsTotalPrice.maxPrice = goods.batch_preorder_maxPrice * quantity
      } else if (goods.batch_type === 'stock') {
        goodsTotalPrice = goods.batch_stock_unitPrice * quantity;
      }

      // 计算满减优惠
      let discount = 0;
      goods.batch_discounts.forEach(item => {
        if (quantity >= item.quantity) {
          discount = Math.max(discount, item.discount);
        }
      });
      if (goods.batch_type === 'preorder') {
        discount = Math.min(discount, goodsTotalPrice.minPrice); // 确保优惠不超过总价（避免负数）
      } else if (goods.batch_type === 'stock') {
        discount = Math.min(discount, goodsTotalPrice); // 确保优惠不超过总价（避免负数）
      }

      const result = {
        quantity: quantity,
        discount,
      };

      if (goods.batch_type === 'preorder') {
        result.goodsTotalMinPrice = goodsTotalPrice.minPrice
        result.goodsTotalMaxPrice = goodsTotalPrice.maxPrice
      } else {
        result.goodsTotalPrice = goodsTotalPrice
      }

      if (provinceCode) { // 有收获地址
        const provinceRule = goods.batch_shipProvinces.find(item => item.code===provinceCode);
        if (!provinceRule) {
          throw new Error('所选省份暂不支持配送');
        }

        // 计算邮费逻辑（复用订单创建逻辑）
        let postage = 0;
        if (provinceRule.freeShippingQuantity && quantity >= provinceRule.freeShippingQuantity) {
          postage = 0;
        } else {
          postage = provinceRule.basePostage;
          if (quantity > provinceRule.baseQuantity) {
            const excess = quantity - provinceRule.baseQuantity;
            const extraUnits = Math.ceil(excess / provinceRule.extraQuantity);
            postage += extraUnits * provinceRule.extraPostage;
          }
        }
        result.postage = postage
        
        if (goods.batch_type === 'preorder') {
          result.finalAmountMin = goodsTotalPrice.minPrice + postage - discount
          result.finalAmountMax = goodsTotalPrice.maxPrice + postage - discount
        } else if (goods.batch_type === 'stock') {
          result.finalAmount = goodsTotalPrice + postage - discount
        }

      }

      return result;

    } catch (error) {
      throw error;
    }
  }
}

module.exports = new OrderService()