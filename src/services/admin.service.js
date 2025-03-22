const connection = require('../app/database')

const { encryptPasswordUtil } = require('../utils/encrypt-password-util')

const escapeLike = require('../utils/escapeLike')

const {
  DEFAULT_PASSWORD
} = require('../app/config')

class AdminService {
  async createAdmin(params) {
    const {phone, name, role, password} = params

    if (!phone) {
      throw new Error('缺少参数: phone');
    }
    if (!name) {
      throw new Error('缺少参数: name');
    }
    if (!role) {
      throw new Error('缺少参数: role');
    }
    if (password.length < 6) {
      throw new Error('密码不得少于6位')
    }

    const existedPhonesResult = await connection.execute(`SELECT phone FROM admin`, [])
    const existedPhones = existedPhonesResult[0]
    let phoneExisted = existedPhones.find(item => phone === item.phone)
    if (phoneExisted) {
      throw new Error('手机号已存在')
    }
    
    const hashedPassword = encryptPasswordUtil(password || DEFAULT_PASSWORD)
    
    const statement = `INSERT admin (name, phone, password, role, create_by) VALUES (?,?,?,?,?)`
    const result = await connection.execute(statement, [
      name, phone, hashedPassword, role, (thePhone || null)
    ])

    return 'success'
  }

  async updateAdmin(params) {
    const {phone, name, role, password} = params

    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!name && !password && !role) {
      throw new Error('无更新的字段')
    }

    const updateFields = [];
    const queryParams = [];

    if (name) {
      updateFields.push('name = ?');
      queryParams.push(name);
    }
    if (password) {
      updateFields.push('password = ?');
      queryParams.push(encryptPasswordUtil(password));
    }
    if (role) {
      updateFields.push('role = ?');
      queryParams.push(role);
    }

    const statement = `
      UPDATE admin 
      SET ${updateFields.join(', ')} 
      WHERE phone = ?
    `;
    queryParams.push(phone);

    try {
      const [result] = await connection.execute(statement, queryParams);
      if (result.affectedRows === 0) {
        throw new Error('管理员不存在');
      }
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  async getAdminList(params) {
    const {phone, name, pageNo, pageSize} = params

    const queryParams = [];
  
    let whereClause = ` WHERE 1=1`;
  
    if (phone) {
      whereClause += ` AND phone LIKE ?`;
      queryParams.push(`%${escapeLike(phone)}%`);
    }
  
    if (name) {
      whereClause += ` AND name LIKE ?`;
      queryParams.push(`%${escapeLike(name)}%`);
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM admin` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
  
    const statement = `SELECT phone, name, role FROM admin` + whereClause + ` LIMIT ? OFFSET ?`;
    queryParams.push(String(pageSizeInt), String(offset));
    const result = await connection.execute(statement, queryParams);
  
    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

  async deleteAdminByPhone(params) {
    const { phone } = params

    if (!phone) {
      throw new Error('缺少参数：phone')
    }

    try {
      const [result] = await connection.execute(`DELETE FROM admin WHERE phone = ?`, [phone]);
      if (result.affectedRows === 0) {
        throw new Error('管理员不存在');
      }
      return 'success';
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AdminService()