const connection = require('../app/database')

const { encryptPasswordUtil } = require('../utils/encrypt-password-util')

const escapeLike = require('../utils/escapeLike')

const {
  DEFAULT_PASSWORD
} = require('../app/config')

const { 
  comparePasswordUtil 
} = require('../utils/encrypt-password-util')

const logger = require('../utils/logger')

const customError = require('../utils/customError')

class AdminService {
  async createAdmin(params) {
    const {phone, name, role, password, thePhone} = params

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
      const [totalResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM admin ${whereClause}`, 
        queryParams
      );
      const total = totalResult[0].total;
    
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
    
      queryParams.push(String(pageSizeInt), String(offset));
      const [result] = await connection.execute(
        `SELECT phone, name, role, isLocked FROM admin ${whereClause} LIMIT ? OFFSET ?`, 
        queryParams
      );
    
      return {
        total,
        records: result,
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

  async checkAdminLogin(params) {
    const { phone, password } = params

    try {
      const [adminInfoResult] = await connection.execute(`SELECT * FROM admin WHERE phone = ?`, [phone]);
      if (adminInfoResult.length === 0) {
        logger.warn('login', '该手机号的admin不存在', { phone })
        return {
          flag: 'no admin'
        }
      }

      const adminInfo = adminInfoResult[0]

      if (adminInfo.isLocked) {
        logger.warn('login', '该admin已锁定，无法登陆', { phone })
        return {
          flag: 'already locked'
        }
      }

      if (!comparePasswordUtil(password, adminInfo.password)) {
        const failCount = adminInfo.failCount || 0;
        const newFailCount = +adminInfo.failCount+1;
        if (failCount >= 2) {
          await connection.execute(`UPDATE admin SET isLocked = 1, failCount = ? WHERE phone = ?`, [newFailCount, phone]);
          logger.warn('login', '密码错误', { phone, password })
          return {
            flag: 'locked'
          }
        } else {
          await connection.execute(`UPDATE admin SET failCount = ? WHERE phone = ?`, [newFailCount, phone]);
          logger.warn('login', '密码错误', { phone, password })
          return {
            flag: 'failCountAdded'
          }
        }
      } else {
        return {
          flag: 'pass',
          adminInfo,
        }
      }

    } catch (error) {
      logger.error('service', 'service error: deleteAdminByPhone', { error })
      throw error;
    }
  }

  async unlockAdmin(params) {
    const { phone } = params

    try {
      const [result] = await connection.execute(`
        UPDATE admin SET isLocked = 0, failCount = 0 WHERE phone = ?
      `, [phone]);
      if (result.affectedRows === 0) {
        throw new customError.ResourceNotFoundError('admin不存在');
      }
      
      return 'success'
    } catch (error) {
      logger.error('service', 'service error: unlockAdmin', { error })

      throw error;
    }
  }
}

module.exports = new AdminService()