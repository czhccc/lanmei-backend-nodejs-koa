const connection = require('../app/database')
const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config')

class OrderService {
  async createOrder(params) {

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const {
        goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_minPrice, total_maxPrice, total_price, remark_self
      } = params

      let statement = null
      let result = null

      if (batch_type === 'preorder') {
        statement = `
          INSERT \`order\` 
            (user, goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, order_time, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_minPrice, total_maxPrice, status, order_no, remark_self) 
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `
        result = await conn.execute(statement, [
          params.thePhone, goods_id, batch_no, batch_type, Number(num), receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, Number(discount_amount), Number(postage), dayjs().format('YYYY-MM-DD HH:mm:ss'), snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), snapshot_discounts, generation_type, total_minPrice, total_maxPrice, 'reserved', `${dayjs().format('YYYYMMDDHHmmss')}${params.thePhone.slice(-4)}`, remark_self
        ])
      } else {
        statement = `
          INSERT \`order\` 
            (user, goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, pay_time, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_price, status, order_no, remark_self) 
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `
        result = await conn.execute(statement, [
          params.thePhone, goods_id, batch_no, batch_type, Number(num), receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, Number(discount_amount), Number(postage), dayjs().format('YYYY-MM-DD HH:mm:ss'), snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), snapshot_discounts, generation_type, total_price, 'paid', `${dayjs().format('YYYYMMDDHHmmss')}${params.thePhone.slice(-4)}`, remark_self
        ])
      }
      
      await conn.commit();
      return {
        id: result[0].insertId
      }
    } catch (error) {
      console.log(error)
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      conn.release();
    }
  }

  async updateOrder(params) {
    const conn = await connection.getConnection(); // 从连接池获取连接
    try {
      await conn.beginTransaction(); // 开启事务

      const orderDetailStatement = `
        SELECT * FROM \`order\` WHERE id = ?
      `
      const orderDetailResult = await conn.execute(orderDetailStatement, [params.id]);
      let originalFields = orderDetailResult[0][0]


      // 允许修改的字段列表
      const allowedFields = [
        "remark_self",
        "receive_name",
        "receive_phone",
        "receive_method",
        "receive_address",
        "status",
      ];
      const fieldsToUpdate = Object.keys(params).filter(field => allowedFields.includes(field))
      
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
          UPDATE \`order\`
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
      query += ` AND order_no LIKE ?`
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
      SELECT COUNT(*) as total FROM \`order\` ${query}
    `
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    const statement = `
      SELECT * from \`order\` ${query} 
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

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const orderDetailStatement = `
        SELECT * FROM \`order\` WHERE id = ?
      `
      const orderDetailResult = await conn.execute(orderDetailStatement, [id]);

      // 提交事务
      await conn.commit();

      return orderDetailResult[0][0]
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
}

module.exports = new OrderService()