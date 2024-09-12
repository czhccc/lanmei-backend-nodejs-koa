const connection = require('../app/database')

class AdminService {
  async createAdmin(admin) {
    const statement = `INSERT admin (name, phone, password, role) VALUES (?,?,?,?)`
    const result = await connection.execute(statement, [
      admin.name, admin.phone, admin.password, admin.role
    ])
    
    return result[0]
  }

  async updateAdmin(params) {
    let statement = `
      UPDATE admin
      SET phone = ?, name = ?, role = ?
    `
    
    let queryParams = [params.phone, params.name, params.role]
    if (params.password) {
      statement += `, password = ?`;
      queryParams.push(params.password);
    }
    statement += ` WHERE id = ?`
    queryParams.push(params.id)

    const result = await connection.execute(statement, queryParams)
    
    return result[0]
  }

  async queryAdminByPhone(params) {
    let statement = `SELECT * FROM admin WHERE phone=?`;

    const queryParams = [params.phone];

    const result = await connection.execute(statement, queryParams);
    return result[0];
  }

  
  async getAdminList(params) {
    // 用于存储查询参数
    const queryParams = [];
  
    // 动态构建查询条件
    let whereClause = ` WHERE 1=1`;  // 条件部分
  
    if (params.phone) {
      whereClause += ` AND phone LIKE ?`;
      queryParams.push(`%${params.phone}%`);
    }
  
    if (params.name) {
      whereClause += ` AND name LIKE ?`;
      queryParams.push(`%${params.name}%`);
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM admin` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;
  
    // 构建分页查询的 SQL 语句
    const statement = `SELECT id,phone,name,role FROM admin` + whereClause + ` LIMIT ? OFFSET ?`;
    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

  async deleteAdminByPhone(params) {
    const statement = `DELETE FROM admin WHERE phone = ?`;
    const result = await connection.execute(statement, [params.phone]);
    return result[0]
  }
}

module.exports = new AdminService()