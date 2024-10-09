const connection = require('../app/database')

class WechatService {
  async addAddress(params) {
    const { name, phone, user, region, detail, isDefault } = params

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      if (isDefault) {
        const updateStatement = `UPDATE customer_address SET isDefault = 0 WHERE user = ?`
        const updateResult = await conn.execute(updateStatement, [
          user
        ])
      }

      const insertStatement = `INSERT customer_address (name, phone, user, region, detail, isDefault) VALUES (?,?,?,?,?,?)`
      const insertResult = await conn.execute(insertStatement, [
        name, phone, user, region, detail, isDefault?1:0
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
    const { id, name, phone, user, region, detail, isDefault } = params

    const updateStatement = `
      UPDATE customer_address 
      SET name=?, phone=?, user=?, region=?, detail=?, isDefault=?
      WHERE id = ?
    `

    const updateResult = await connection.execute(updateStatement, [
      name, phone, user, region, detail, isDefault, id
    ])

    return '提交成功'
  }

  async getAddressList(params) {
    const { user } = params

    const statement = `SELECT * from customer_address WHERE user=?`

    const result = await connection.execute(statement, [ user ])

    return result[0]
  }

  async deleteAddress(params) {
    const { id } = params

    const statement = `DELETE FROM customer_address WHERE id = ?`;
    const result = await connection.execute(statement, [ id ]);
    return '删除成功'
  }
}

module.exports = new WechatService()