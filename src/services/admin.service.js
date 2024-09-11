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
    console.log('params',params)
    // 基础 SQL 查询语句，`1=1` 是为了方便后续动态添加条件
    let statement = `SELECT * FROM admin WHERE 1=1`;

    // 用于存储查询参数
    const queryParams = [];

    // 动态构建查询条件：如果参数存在且非空，就添加相应的条件
    if (params.phone) {
      statement += ` AND phone LIKE ?`;  // 添加 phone 的查询条件
      queryParams.push(`%${params.phone}%`);  // 添加对应的参数
    }

    if (params.name) {
      statement += ` AND name LIKE ?`;  // 添加 name 的查询条件
      queryParams.push(`%${params.name}%`);  // 添加对应的参数
    }

    const result = await connection.execute(statement, queryParams);
    return result[0];
  }

  async deleteAdminByPhone(params) {
    console.log(params);
    const statement = `DELETE FROM admin WHERE phone = ?`;
    const result = await connection.execute(statement, [params.phone]);
    return result[0]
  }
}

module.exports = new AdminService()