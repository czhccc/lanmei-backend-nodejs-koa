const connection = require('../app/database')

const jwt = require('jsonwebtoken')

const {
  DOMAIN_NAME,
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION,
} = require('../app/config')

const logger = require('../utils/logger')

class LoginService {
  async login(ctx, theUser) {
    
    try {
      const token = jwt.sign(
        {
          phone: theUser.phone,
        }, 
        TOKEN_PRIVATE_KEY,
        {
          expiresIn: TOKEN_DURATION,
          algorithm: 'RS256',
        }
      )

      const isProd = process.env.NODE_ENV === 'production'

      // 3. 设置安全 Cookie
      ctx.cookies.set('token', token, {
        httpOnly: true,      // 禁止 JavaScript 读取（防 XSS）
        secure: isProd,        // 仅 HTTPS 传输（生产环境必须！）
        sameSite: isProd ? 'Strict' : 'Lax',  // 防 CSRF 攻击（可选 Strict/Lax） 开发环境可放宽 sameSite 限制
        maxAge: TOKEN_DURATION, // 与 Token 过期时间一致
        domain: isProd ? DOMAIN_NAME : undefined, // 限制域名
        path: '/'            // Cookie 生效路径
      });

      return {
        phone: theUser.phone,
        token
      }
    } catch (error) {
      logger.error('service', 'service error: login', { error })
      throw error
    }
  }

  async logout(ctx, params) {
    
    try {
      const isProd = process.env.NODE_ENV === 'production'

      ctx.cookies.set('token', '', {
        httpOnly: true,      // 禁止 JavaScript 读取（防 XSS）
        secure: isProd,        // 仅 HTTPS 传输（生产环境必须！）
        sameSite: isProd ? 'Strict' : 'Lax',  // 防 CSRF 攻击（可选 Strict/Lax） 开发环境可放宽 sameSite 限制
        maxAge: 0, // 与 Token 过期时间一致
        domain: isProd ? DOMAIN_NAME : undefined, // 限制域名
        path: '/'            // Cookie 生效路径
      });

      return '登出成功'
    } catch (error) {
      logger.error('service', 'service error: logout', { error })

      throw error
    }
  }

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