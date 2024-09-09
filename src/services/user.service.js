const connection = require('../app/database')

class UserService {
  async create(user) {
    const statement = `INSERT admin (name, phone, password, role) VALUES (?,?,?,?)`
    const result = await connection.execute(statement, [
      user.name, user.phone, user.password, user.role
    ])
    
    return result[0]
  }

  async getAdminByPhone(phone) {
    const statement = `SELECT * FROM admin WHERE phone = ?` // admin表的记录不会很多，所以直接查全部
    const result = await connection.execute(statement, [phone])

    return result[0]
  }
}

module.exports = new UserService()