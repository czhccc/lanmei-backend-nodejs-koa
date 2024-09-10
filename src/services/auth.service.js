const connection = require('../app/database')

class LoginService {
  async getAdminByPhone(phone) {
    const statement = `SELECT * FROM admin WHERE phone = ?` // admin表的记录不会很多，所以直接查全部
    const result = await connection.execute(statement, [phone])

    return result[0]
  }
}

module.exports = new LoginService()