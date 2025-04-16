const jwt = require('jsonwebtoken')

const AuthService = require('../services/auth.service')

const { TOKEN_PUBLIC_KEY } = require('../app/config')

const { 
  comparePasswordUtil 
} = require('../utils/encrypt-password-util')

const logger = require('../utils/logger')

const customError = require('../utils/customError')

// 验证参数
const verifyLoginParams = async (ctx, next) => {
  const { phone, password } = ctx.request.body
  
  if (!phone) {
    throw new customError.MissingParameterError('phone')
  }
  if (!password) {
    throw new customError.MissingParameterError('password')
  }

  const adminByPhone = await AuthService.getAdminByPhone(phone)
  if (adminByPhone.length <= 0) {

    logger.warn('该手机号的admin不存在')
    
    throw new customError.InvalidParameterError('phone', '该手机号的admin不存在')
  } else {
    if (!comparePasswordUtil(password, adminByPhone[0].password)) {

      logger.warn('admin密码错误')

      throw new customError.InvalidParameterError('password', 'admin密码错误')
    }
  }

  ctx.theUser = adminByPhone[0] // 传递数据库中查出的admin

  await next()
}

const verifyToken = async (ctx, next) => {
  const authorization = ctx.headers.authorization
  
  if (!authorization) {
    throw new customError.InvalidTokenError()
  }

  const token = authorization.replace('Bearer ', '')

  // 验证token
  try {
    const adminInfo = jwt.verify(token, TOKEN_PUBLIC_KEY, {
      algorithm: ["RS256"]
    })
    ctx.theUser = adminInfo
  } catch (error) {
    throw new customError.InvalidTokenError()
  }
  
  await next()
}

module.exports = {
  verifyLoginParams,
  verifyToken
}