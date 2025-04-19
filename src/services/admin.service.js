const connection = require('../app/database')

const { encryptPasswordUtil } = require('../utils/encrypt-password-util')

const escapeLike = require('../utils/escapeLike')

const { enum_admin_role } = require('../app/enum')

const {
  DEFAULT_PASSWORD
} = require('../app/config')

const logger = require('../utils/logger')

const customError = require('../utils/customError')

class AdminService {
  async createAdmin(params) {
    const {phone, name, role, password} = params

    try {
      const existedPhonesResult = await connection.execute(`SELECT phone FROM admin`, [])
      const existedPhones = existedPhonesResult[0]
      let phoneExisted = existedPhones.find(item => phone === item.phone)
      if (phoneExisted) {
        throw new customError.InvalidParameterError('phone', '该手机号已存在')
      }
      
      const hashedPassword = encryptPasswordUtil(password || DEFAULT_PASSWORD)
      
      const result = await connection.execute(`INSERT admin (name, phone, password, role, create_by) VALUES (?,?,?,?,?)`, [
        name, phone, hashedPassword, role, (thePhone || null)
      ])

      return '创建成功'
    } catch (error) {
      logger.error('service', 'service error: createAdmin', { error })
      throw error
    }
  }

  async updateAdmin(params) {
    const {phone, name, role, password} = params

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

    queryParams.push(phone);

    try {
      const [result] = await connection.execute(`
        UPDATE admin 
        SET ${updateFields.join(', ')} 
        WHERE phone = ?
      `, queryParams);

      if (result.affectedRows === 0) {
        throw new customError.ResourceNotFoundError('管理员不存在');
      }
      return '更新成功';
    } catch (error) {
      logger.error('service', 'service error: updateAdmin', { error })
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
    
    try {
      const totalResult = await connection.execute(
        `SELECT COUNT(*) as total FROM admin ${whereClause}`, 
        queryParams
      );
      const total = totalResult[0][0].total;
    
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
    
      queryParams.push(String(pageSizeInt), String(offset));
      const result = await connection.execute(
        `SELECT phone, name, role FROM admin ${whereClause} LIMIT ? OFFSET ?`, 
        queryParams
      );
    
      return {
        total,
        records: result[0],
      };   
    } catch (error) {
      logger.error('service', 'service error: getAdminList', { error })
      throw error
    }
  }

  async deleteAdminByPhone(params) {
    const { phone } = params

    try {
      const [result] = await connection.execute(`DELETE FROM admin WHERE phone = ?`, [phone]);
      if (result.affectedRows === 0) {
        throw new customError.ResourceNotFoundError('管理员不存在');
      }
      return '删除成功';
    } catch (error) {
      logger.error('service', 'service error: deleteAdminByPhone', { error })
      throw error;
    }
  }
}

module.exports = new AdminService()