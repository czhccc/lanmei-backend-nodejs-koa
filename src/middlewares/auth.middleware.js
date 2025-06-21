const jwt = require('jsonwebtoken')

const AdminService = require('../services/admin.service')

const { TOKEN_PUBLIC_KEY } = require('../app/config')

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

  const checkAdminLoginResult = await AdminService.checkAdminLogin({ phone, password })
  if (checkAdminLoginResult.flag === 'no admin') {
    throw new customError.InvalidParameterError('phone', '该手机号的admin不存在')
  } else if (checkAdminLoginResult.flag === 'already locked') {
    throw new customError.InvalidParameterError('phone', '该admin已锁定，无法登陆', { phone })
  } else if (checkAdminLoginResult.flag === 'locked') {
    throw new customError.InvalidParameterError('phone', 'admin多次密码错误，已锁定', { phone })
  } else if (checkAdminLoginResult.flag === 'failCountAdded') {
    throw new customError.InvalidParameterError('password', 'admin密码错误', { phone })
  } else if (checkAdminLoginResult.flag === 'pass') {
    ctx.theUser = checkAdminLoginResult.adminInfo
    await next()
  }
}

const verifyToken = async (ctx, next) => {
  const token = ctx.cookies.get('token')
  
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