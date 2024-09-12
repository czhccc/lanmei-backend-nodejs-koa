const jwt = require('jsonwebtoken')

const AuthService = require('../services/auth.service')

const errorTypes = require('../constants/error-types')
const { TOKEN_PUBLIC_KEY } = require('../app/config')

const encryptPasswordUtil = require('../utils/encrypt-password-util')

// 验证参数
const verifyLoginParams = async (ctx, next) => {
  const params = ctx.request.body

  if (!params.phone || !params.password) {
    throw new Error(errorTypes.NECESSARY_PARAM_IS_NULL)
  }

  // 判断密码是否通过
  const adminByPhone = await AuthService.getAdminByPhone(params.phone)
  if (adminByPhone.length <= 0) { // 该手机号的admin不存在
    throw new Error(errorTypes.ADMIN_NOT_EXIST)
  } else {
    if (encryptPasswordUtil(params.password) !== adminByPhone[0].password) { // 密码错误
      throw new Error(errorTypes.ADMIN_PASSWORD_WRONG)
    }
  }

  ctx.theAdmin = adminByPhone[0] // 传递数据库中查出的admin

  await next()
}

const verifyToken = async (ctx, next) => {
  console.log('验证Token');
  const authorization = ctx.headers.authorization

  if (!authorization) {
    throw new Error(errorTypes.UNAUTHORIZED)
  }

  const token = authorization.replace('Bearer ', '')

  // 验证token
  const adminInfo = jwt.verify(token, TOKEN_PUBLIC_KEY, {
    algorithm: ["RS256"]
  })

  ctx.theAdmin = adminInfo
  
  await next()
}

module.exports = {
  verifyLoginParams,
  verifyToken
}