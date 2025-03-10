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
        goods_id, batch_no, batch_type, num, receive_isHomeDelivery, receive_name, receive_phone, 
        receive_province, receive_provinceCode, receive_city, receive_cityCode, receive_district, receive_districtCode, receive_address, 
        remark_customer, discount_amount, postage, snapshot_coverImage, snapshot_goodsName, 
        snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, 
        generation_type, total_minPrice, total_maxPrice, total_price, 
        remark_self = ''
      } = params;

      // ====================== 基础校验 ======================
      if (!(Number.isInteger(num) && num>0)) {
        throw new Error('商品数量必须为正整数')
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
             batch_stock_remainingAmount = batch_stock_remainingAmount - ?, 
             goods_isSelling = CASE 
               WHEN (batch_stock_remainingAmount - ?) <= 0 THEN 0 
               ELSE goods_isSelling 
             END 
           WHERE 
             id = ? 
             AND batch_stock_remainingAmount >= ? 
             AND goods_isSelling = 1`,
          [num, num, goods_id, num]
        );
  
        if (updateResult.affectedRows === 0) {
          if (Number(batchInfo.batch_stock_remainingAmount) === 0) {
            throw new Error('商品余量为0')
          }
          if (batchInfo.batch_stock_remainingAmount < num) {
            throw new Error('商品余量不足');
          }
        }
      }
  
      // ====================== 生成订单 ======================
      const orderBaseFields = {
        generation_type,
        goods_id,
        user: params.thePhone,
        order_no: `${dayjs().format('YYYYMMDDHHmmss')}${params.thePhone.slice(-4)}`,
        batch_no,
        batch_type,
        num: Number(num),
        receive_isHomeDelivery: receive_isHomeDelivery || 0,
        receive_name,
        receive_phone,
        receive_province, receive_provinceCode, receive_city, receive_cityCode, receive_district, receive_districtCode, receive_address,
        remark_customer,
        discountAmount_promotion: Number(discount_amount),
        postage: Number(postage),
        snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText: snapshot_goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), snapshot_discounts,
        remark_self,
      };
  
      // 根据订单类型动态添加字段
      let orderFields;
      if (batch_type === 'preorder') {
        orderFields = {
          ...orderBaseFields,
          preorder_minPrice: Number(batchInfo.batch_minPrice),
          preorder_maxPrice: Number(batchInfo.batch_maxPrice),
          preorder_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          status: 'reserved',
        };
      } else {
        orderFields = {
          ...orderBaseFields,
          stock_unitPrice: Number(batchInfo.batch_unitPrice),
          pay_finalAmount: Number(total_price),
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

      switch (error.message) {
        case '商品数量必须为正整数': throw new Error('商品数量必须为正整数');
        case '商品已下架': throw new Error('商品已下架');
        case '商品余量为0': throw new Error('商品余量为0');
        case '商品余量不足': throw new Error('商品余量不足');
        case '所选省份不可邮寄': throw new Error('所选省份不可邮寄');
        case '只有嵊州市可以送货上门': throw new Error('只有嵊州市可以送货上门');
        default: throw new Error('mysql事务失败，已回滚');
      }
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

      let finalAmount = null
      if (orderInfo.batch_type === 'preorder') {
        finalAmount = Number(orderInfo.preorder_finalPrice)*Number(orderInfo.num) + Number(orderInfo.postage) - Number(orderInfo.discountAmount_promotion) - Number(orderInfo.discountAmount_custom)
      } else if (orderInfo.batch_type === 'stock') {
        finalAmount = Number(orderInfo.stock_unitPrice)*Number(orderInfo.num) + Number(orderInfo.postage) - Number(orderInfo.discountAmount_promotion) - Number(orderInfo.discountAmount_custom)
      }

      const updateOrderStatement = `
        UPDATE orders 
        SET 
          status = 'paid',
          pay_finalAmount = ?,
          pay_time = ?
        WHERE 
          id = ? 
          AND status = 'unpaid'
      `;
      const updateOrderResult = await conn.execute(updateOrderStatement, [
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
}

module.exports = new OrderService()