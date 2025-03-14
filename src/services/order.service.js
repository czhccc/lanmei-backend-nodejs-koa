const connection = require('../app/database')
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
        goods_id, batch_no, batch_type, quantity, receive_isHomeDelivery, receive_name, receive_phone, 
        receive_province, receive_provinceCode, receive_city, receive_cityCode, receive_district, receive_districtCode, receive_address, 
        remark_customer, discount_amount, snapshot_coverImage, snapshot_goodsName, 
        snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, 
        generation_type, total_minPrice, total_maxPrice, total_price, 
        remark_self = ''
      } = params;

      // ====================== 基础校验 ======================
      if (!(Number.isInteger(quantity) && quantity>0)) {
        throw new Error('商品数量必须为正整数')
      }
      if (!receive_province || !receive_provinceCode || !receive_city || !receive_cityCode || !receive_district || !receive_districtCode || !receive_address) {
        throw new Error('收货地址信息不完整')
      }
  
      // ====================== 获取商品信息 ======================
      const batchInfoResult = await conn.execute(
        'SELECT * FROM goods WHERE id = ? FOR UPDATE',
        [goods_id]
      );
      const batchInfo = batchInfoResult[0][0];

      // ====================== 通用校验（无论预订还是现货） ======================
      if (batchInfo.goods_isSelling !== 1) {
        throw new Error('商品已下架');
      }

      const shipProvinces = batchInfo.batch_shipProvinces.map(item => item.name);
      if (!shipProvinces) {
        throw new Error('所选省份不在数据库中');
      }
      if (!shipProvinces.includes(receive_province)) {
        throw new Error('所选省份不可邮寄');
      }

      if (receive_isHomeDelivery && receive_district !== '嵊州市') {
        throw new Error('只有嵊州市可以送货上门');
      }

      // ====================== 按批次类型处理 ======================
      if (batch_type === 'preorder') {

      } else if (batch_type === 'stock') {
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
          if (batchInfo.batch_stock_remainingQuantity < quantity) {
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
      if (postageRule.freeShippingQuantity && Quantity>=postageRule.freeShippingQuantity) { // 达到包邮条件
        postage = 0
      } else {
        if (Quantity <= postageRule.baseQuantity) { // 首重之内
          postage = postageRule.basePostage
        }
        if ((Quantity>postageRule.baseQuantity) && (Quantity<postageRule.freeShippingQuantity)) { // 大于首重
          let excess = quantity - postageRule.baseQuantity; // 超出首重的数量
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
        if (quantity >= item.quantity) {
          discountAmountPromotion = Math.max(discountAmountPromotion, item.discount);
        }
      })

      // 生成订单号
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const orderNo = `${dayjs().format('YYYYMMDDHHmmss')}${params.thePhone.slice(-4)}${randomSuffix}`;

      const orderBaseFields = {
        generation_type,
        goods_id,
        user: params.thePhone,
        order_no: orderNo,
        batch_no,
        batch_type,
        quantity: Number(quantity),
        receive_isHomeDelivery: receive_isHomeDelivery || 0,
        receive_name,
        receive_phone,
        receive_province, receive_provinceCode, receive_city, receive_cityCode, receive_district, receive_districtCode, receive_address,
        remark_customer,
        discountAmount_promotion: Number(discount_amount),
        postage: Number(postage),
        snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, 
        snapshot_goodsRichText: (snapshot_goodsRichText || '').replaceAll(BASE_URL, 'BASE_URL'), 
        snapshot_discounts,
        remark_self,
      };
      
      // 根据订单类型动态添加字段
      let orderFields;
      if (batch_type === 'preorder') {
        orderFields = {
          ...orderBaseFields,
          preorder_minPrice: Number(batchInfo.batch_preorder_minPrice || 0),
          preorder_maxPrice: Number(batchInfo.batch_preorder_maxPrice || 0),
          preorder_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'reserved',
        };
      } else if (batch_type === 'stock') {
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
      return { id: insertResult.insertId };
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async updateOrder(params) {
    const conn = await connection.getConnection(); // 从连接池获取连接
    try {
      await conn.beginTransaction(); // 开启事务

      const orderDetailStatement = `
        SELECT * FROM orders WHERE id = ?
      `
      const orderDetailResult = await conn.execute(orderDetailStatement, [params.id]);
      let originalFields = orderDetailResult[0][0]

      // 允许修改的字段列表
      const allowedFields = [
        "remark_self",
        "receive_name",
        "receive_phone",
        "receive_province", 
        "receive_provinceCode", 
        "receive_city", 
        "receive_cityCode", 
        "receive_district", 
        "receive_districtCode",
        "receive_address",
        "receive_isHomeDelivery",
        "status",
      ];
      const fieldsToUpdate = Object.keys(params).filter(field => allowedFields.includes(field))

      const batchInfoResult = await conn.execute('SELECT * FROM goods WHERE id = ?', [goods_id]);
      const batchInfo = batchInfoResult[0][0]
      if (batchInfo.goods_isSelling !== 1) {
        throw new Error('商品已下架');
      }
      if (!batchInfo.batch_shipProvinces.includes(receive_province)) {
        throw new Error('所选省份不可邮寄')
      }
      
      // 记录日志 SQL
      let changedFields = {}
      for (const field of fieldsToUpdate) {
        if (originalFields[field] !== params[field]) {
          console.log(field, originalFields[field], params[field]);
          changedFields[field] = {
            before: originalFields[field],
            after: params[field],
          }
        }
      }
      
      if (Object.keys(changedFields).length > 0) {
        const logStatement = `INSERT INTO order_logs (order_id, order_no, operator, changes) VALUES (?, ?, ?, ?)`;
        await conn.execute(logStatement, [params.id, originalFields.order_no, params.thePhone, JSON.stringify(changedFields)]);

        // 更新订单
        const setFields = fieldsToUpdate.map(field => `\`${field}\` = ?`);
        const updateValues = fieldsToUpdate.map(field => params[field]);
        const updateStatement = `
          UPDATE orders
          SET ${setFields.join(", ")}
          WHERE id = ?
        `;
        updateValues.push(params.id); // 添加订单 ID
        const [updateResult] = await conn.execute(updateStatement, updateValues);

        await conn.commit(); // 提交事务

        return '订单修改成功'
      } else {
        return '订单无改动'
      }
    } catch (error) {
      // 出现错误时回滚事务
      console.error("更新订单失败：", error);
      await conn.rollback();
      throw new Error("更新订单失败，已回滚");
    } finally {
      // 释放连接
      conn.release();
    }
  }  

  async getOrderList(params) {
    let query = ' WHERE 1=1'
    let queryParams = []

    if (params.user) {
      query += ` AND user LIKE ?`
      queryParams.push(`%${params.user}%`)
    }
    if (params.batch_type) {
      query += ` AND batch_type = ?`
      queryParams.push(params.batch_type)
    }
    if (params.generation_type) {
      query += ` AND generation_type = ?`
      queryParams.push(params.generation_type)
    }
    if (params.order_no) {
      query += ` AND order_no LIKE ?`
      queryParams.push(`%${params.order_no}%`)
    }
    if (params.batch_no) {
      query += ` AND batch_no LIKE ?`
      queryParams.push(`%${params.batch_no}%`)
    }
    if (params.snapshot_goodsName) {
      query += ` AND snapshot_goodsName LIKE ?`
      queryParams.push(`%${params.snapshot_goodsName}%`)
    }
    if (params.status) {
      query += ` AND status = ?`
      queryParams.push(params.status)
    }
    if (params.startTime || params.endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total FROM orders ${query}
    `
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    const statement = `
      SELECT * from orders ${query} 
        ORDER BY createTime DESC 
          LIMIT ? OFFSET ?
    `
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;
    queryParams.push(String(pageSize), String(offset))
    const result = await connection.execute(statement, queryParams)

    return {
      total,  // 总记录数
      records: result[0]
    };
  }

  async getOrderDetailById(params) {
    const { id } = params

    if (!id) {
      throw new Error('订单id为空')
    }

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const orderDetailStatement = `
        SELECT * FROM orders WHERE id = ?
      `
      const orderDetailResult = await conn.execute(orderDetailStatement, [id]);

      await conn.commit();
      
      return orderDetailResult[0][0]
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error;
    } finally {
      // 释放连接
      conn.release();
    }
  }

  async cancelSingleReservedOrder(params) {
    let { orderId, cancelOrderReason=null, thePhone } = params

    if (!orderId || !Number.isInteger(Number(orderId))) {
      throw new Error('订单id为空')
    }

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const cancelReservedOrderStatement = `
        UPDATE orders 
          SET status = 'canceled', cancel_reason = ?, cancel_time = ?, cancel_by = ?
        WHERE id = ? AND status = 'reserved'
      `
      const [cancelReservedOrderResult] = await conn.execute(cancelReservedOrderStatement, [
        cancelOrderReason, dayjs().format('YYYY-MM-DD HH:mm:ss'), thePhone, orderId
      ]);
      if (cancelReservedOrderResult.affectedRows === 0) {
        const orderDetailStatement = `
          SELECT * FROM orders WHERE id = ?
        `
        const orderDetailResult = await conn.execute(orderDetailStatement, [id]);
        const orderDetail = orderDetailResult[0]
        if (orderDetail.length === 0) {
          throw new Error('订单不存在')
        }
        const orderInfo = orderDetail[0]

        if (orderInfo.status !== 'reserved') {
          throw new Error('此订单非预订状态，无法取消预订')
        }
      }

      await conn.commit();
      
      return 'success'
    } catch (error) {
      console.log(error)
      await conn.rollback();
      throw error
    } finally {
      conn.release();
    }
  }

  async getOrderLogsList(params) {
    let query = ' WHERE 1=1'
    let queryParams = []

    if (params.order_id) {
      query += ` AND order_id LIKE ?`
      queryParams.push(`%${params.order_id}%`)
    }
    if (params.order_no) {
      query += ` AND order_no LIKE ?`
      queryParams.push(`%${params.order_no}%`)
    }
    if (params.operator) {
      query += ` AND operator LIKE ?`
      queryParams.push(`%${params.operator}%`)
    }
    if (params.startTime || params.endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total FROM order_logs ${query}
    `
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    const statement = `
      SELECT * from order_logs ${query} 
        ORDER BY createTime DESC 
          LIMIT ? OFFSET ?
    `
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;
    queryParams.push(String(pageSize), String(offset))
    const result = await connection.execute(statement, queryParams)

    return {
      total,  // 总记录数
      records: result[0]
    };
  }

  async payOrder(params) {
    const { orderId } = params

    if (!orderId || !Number.isInteger(Number(orderId))) {
      throw new Error('订单ID无效');
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      const [getOrderInfoResult] = await conn.execute(
        'SELECT * FROM orders WHERE id = ? FOR UPDATE',
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
        'SELECT * FROM goods WHERE id = ? FOR UPDATE',
        [orderInfo.goods_id]
      );
      const batchInfo = batchInfoResult[0][0];

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
      let discountAmountPromotion = 0;
      batchInfo.batch_discounts.forEach(item => {
        if (quantity >= item.quantity) {
          discountAmountPromotion = Math.max(discountAmountPromotion, item.discount);
        }
      })

      // 计算商品总价
      let goodsTotalPrice = null
      let finalAmount = null
      if (orderInfo.batch_type === 'preorder') {
        goodsTotalPrice = Number(batchInfo.batch_preorder_finalPrice) * Number(quantity)

        finalAmount = goodsTotalPrice + postage - discountAmountPromotion
      } else if (orderInfo.batch_type === 'stock') {
        goodsTotalPrice = Number(batchInfo.batch_stock_unitPrice) * Number(quantity)

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
      conn.release();
    }

  }

  async completeOrder(params) {
    const { orderId, thePhone } = params

    if (!orderId || !Number.isInteger(Number(orderId))) {
      throw new Error('订单ID无效');
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      const completeOrderStatement = `
        UPDATE orders 
        SET 
          status = 'completed',
          complete_time = ?,
          complete_by = ?
        WHERE 
          id = ? 
          AND status = 'paid'
      `;
      const [completeOrderResult] = await conn.execute(completeOrderStatement, [
        dayjs().format('YYYY-MM-DD HH:mm:ss'), thePhone, orderId
      ]);

      console.log(completeOrderResult);

      if (completeOrderResult.affectedRows === 0) {
        console.log('啊啊啊啊');
        const [getOrderInfoResult] = await conn.execute(
          'SELECT * FROM orders WHERE id = ? FOR UPDATE',
          [orderId]
        );
  
        if (getOrderInfoResult.length === 0) {
          throw new Error('订单不存在');
        }
  
        const orderInfo = getOrderInfoResult[0]

        console.log(orderInfo);
  
        if (orderInfo.status !== 'paid') {
          throw new Error('订单不是已付款状态');
        }

        throw new Error('操作失败，请联系管理员')
      }

      await conn.commit();
      return 'success';
    } catch (error) {
      console.log(error);
      await conn.rollback();
      throw error
    } finally {
      conn.release();
    }

  }
}

module.exports = new OrderService()