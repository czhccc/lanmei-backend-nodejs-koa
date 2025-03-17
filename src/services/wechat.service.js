const dayjs = require('dayjs')

const connection = require('../app/database');

class WechatService {

  // 用户收货地址
  async addAddress(params) {
    const { name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault } = params

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      if (isDefault) {
        const updateStatement = `UPDATE customer_address SET isDefault = 0 WHERE create_by = ?`
        const updateResult = await conn.execute(updateStatement, [
          create_by
        ])
      }

      const insertStatement = `
        INSERT 
          customer_address (name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      const insertResult = await conn.execute(insertStatement, [
        name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault?1:0
      ])

      await conn.commit();
      
      return '新增成功'
    } catch (error) {
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      conn.release();
    }
  }
  async editAddress(params) {
    const { id, name, phone, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault } = params

    const updateStatement = `
      UPDATE customer_address 
      SET name=?, phone=?, province=?, provinceCode=?, city=?, cityCode=?, district=?, districtCode=?, detail=?, isDefault=?
      WHERE id = ?
    `

    const updateResult = await connection.execute(updateStatement, [
      name, phone, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault, id
    ])

    return '提交成功'
  }
  async getAddressList(params) {
    const { create_by } = params

    const statement = `SELECT * from customer_address WHERE create_by=?`

    const result = await connection.execute(statement, [ create_by ])

    return result[0]
  }
  async deleteAddress(params) {
    const { id } = params

    const statement = `DELETE FROM customer_address WHERE id = ?`;
    const result = await connection.execute(statement, [ id ]);
    return '删除成功'
  }
  async getDefaultAddress(params) {
    const { create_by } = params

    const statement = `SELECT * from customer_address WHERE create_by=? AND isDefault=1`

    const result = await connection.execute(statement, [ create_by ])

    return result[0]
  }


  // 用户首页通知
  async notify(params) {
    const { content, thePhone } = params
    const insertStatement = `INSERT wechat_home_notify (content, createBy) VALUES (?,?)`
    const insertResult = await connection.execute(insertStatement, [
      content, thePhone
    ])
    return insertResult
  }
  async getNotificationList(params) {
    const queryParams = [];
  
    let whereClause = ` WHERE 1=1`;
  
    // if (params.phone) {
    //   whereClause += ` AND phone LIKE ?`;
    //   queryParams.push(`%${params.phone}%`);
    // }
  
    const countStatement = `SELECT COUNT(*) as total FROM wechat_home_notify` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;
  
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;
  
    const statement = `
      SELECT * FROM wechat_home_notify 
      ${whereClause} 
      ORDER BY createTime DESC 
      LIMIT ? OFFSET ?
    `;
    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,
      records: result[0],
    };
  }
  async getLatestNotification() {
    const statement = `SELECT * FROM wechat_home_notify ORDER BY createTime DESC LIMIT 1`
    const result = await connection.execute(statement);
    let record = result[0][0]
    record.createTime = dayjs(record.createTime).format('YYYY-MM-DD HH:mm')
    return record;
  }
  
}

module.exports = new WechatService()