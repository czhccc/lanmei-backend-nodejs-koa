const connection = require('../app/database')

const logger = require('../utils/logger')

class LoginService {
  async getAdminByPhone(phone) {
    try {
      // admin表的记录不会很多，所以直接查全部
      const result = await connection.execute(`SELECT * FROM admin WHERE phone = ?`, [phone])

      return result[0]   
    } catch (error) {
      logger.error('service', 'service error: getAdminByPhone', { error })
      throw error
    }
  }
}

module.exports = new LoginService()