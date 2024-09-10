const connection = require('../app/database')

class AdminService {
  async create(admin) {
    const statement = `INSERT admin (name, phone, password, role) VALUES (?,?,?,?)`
    const result = await connection.execute(statement, [
      admin.name, admin.phone, admin.password, admin.role
    ])
    
    return result[0]
  }

  async queryAdminByPhoneOrName(params) {
    const statement = `SELECT * FROM admin WHERE phone LIKE ? AND name LIKE ?`;
    const result = await connection.execute(statement, [`%${params.phone}%`, `%${params.name}%`]);
    return result[0]
  }
}

module.exports = new AdminService()