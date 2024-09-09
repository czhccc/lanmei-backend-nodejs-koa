const jwt = require('jsonwebtoken')

const LoginService = require('../services/login.service')

const errorTypes = require('../constants/error-types')
const { TOKEN_PUBLIC_KEY } = require('../app/config')

const encryptPasswordUtil = require('../utils/encryptPasswordUtil')

// 验证参数
const verifyLoginParams = async (ctx, next) => {
  const params = ctx.request.body

  console.log('admin Params', params)

  // 判断 非空
  if (!params.phone || !params.password) {
    const error = new Error(errorTypes.NECESSARY_PARAM_IS_NULL)
    return ctx.app.emit('error', error, ctx)
  }

  // 判断密码是否通过
  const adminByPhone = await LoginService.getAdminByPhone(params.phone)
  if (adminByPhone.length <= 0) { // 该手机号的admin不存在
    const error = new Error(errorTypes.ADMIN_NOT_EXIST)
    return ctx.app.emit('error', error, ctx)
  } else { // 有admin
    const thePassword = adminByPhone[0].password
    if (encryptPasswordUtil(params.password) !== thePassword) { // 密码错误
      const error = new Error(errorTypes.ADMIN_PASSWORD_WRONG)
      return ctx.app.emit('error', error, ctx)
    }
  }

  ctx.theAdmin = adminByPhone[0] // 传递数据库中查出的admin

  await next()
}

const verifyToken = async (ctx, next) => {
  // 获取token
  const authorization = ctx.headers.authorization
  const token = authorization.replace('Bearer ', '')

  console.log('token', token);

  // 验证token
  try {
    const result = jwt.verify(token, TOKEN_PUBLIC_KEY, {
      algorithm: ["RS256"]
    })

    console.log('token-result', result);

    ctx.theAdmin = result

    await next()
  } catch (err) {
    console.log('token catch error', err);
    const error = new Error(errorTypes.UNAUTHORIZED)
    ctx.app.emit('error', error, ctx)
  }
}

module.exports = {
  verifyLoginParams,
  verifyToken
}