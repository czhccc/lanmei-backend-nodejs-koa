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
        user, goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_minPrice, total_maxPrice, total_price
      } = params

      let statement = null
      let result = null

      if (batch_type === 'preorder') {
        statement = `
          INSERT \`order\` 
            (user, goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, order_time, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_minPrice, total_maxPrice, status, order_no) 
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `
        result = await conn.execute(statement, [
          user, goods_id, batch_no, batch_type, Number(num), receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, Number(discount_amount), Number(postage), dayjs().format('YYYY-MM-DD HH:mm:ss'), snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), snapshot_discounts, generation_type, total_minPrice, total_maxPrice, 'reserved', `${dayjs().format('YYYYMMDDHHmmss')}${user.slice(-4)}`
        ])
      } else {
        statement = `
          INSERT \`order\` 
            (user, goods_id, batch_no, batch_type, num, receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, discount_amount, postage, order_time, snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText, snapshot_discounts, generation_type, total_price, status, order_no) 
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `
        result = await conn.execute(statement, [
          user, goods_id, batch_no, batch_type, Number(num), receive_method, receive_name, receive_phone, receive_region, receive_address, remark_customer, Number(discount_amount), Number(postage), dayjs().format('YYYY-MM-DD HH:mm:ss'), snapshot_coverImage, snapshot_goodsName, snapshot_goodsUnit, snapshot_goodsRemark, snapshot_goodsRichText.replaceAll(BASE_URL, 'BASE_URL'), snapshot_discounts, generation_type, total_price, 'paid', `${dayjs().format('YYYYMMDDHHmmss')}${user.slice(-4)}`
        ])
      }
      
      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      console.log(error)
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }
  }

  async getOrderList(params) {
    let query = ''
    let queryParams = [params.user, params.batch_type]

    const statement = `
      SELECT * from \`order\` WHERE generation_type='auto' AND user=? AND batch_type=? ${query} 
        ORDER BY createTime DESC 
          LIMIT ? OFFSET ?
    `

    if (params.order_no) {
      query += ` AND order_no LIKE ?`
      queryParams.push(`%${params.order_no}%`)  // 将百分号%包括在查询参数内
    }
    if (params.snapshot_goodsName) {
      query += ` AND snapshot_goodsName LIKE ?`
      queryParams.push(`%${params.snapshot_goodsName}%`)
    }
    if (params.status) {
      query += ` AND status=?`
      queryParams.push(params.status)
    }
    if (params.startTime || params.endTime) {
      query += ` AND (createTime >= ? OR ? IS NULL) AND (createTime <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total FROM \`order\` WHERE generation_type='auto' AND user=? AND batch_type=? ${query}
    `
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

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