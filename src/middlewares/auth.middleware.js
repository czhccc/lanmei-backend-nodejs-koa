const jwt = require('jsonwebtoken')

const AuthService = require('../services/auth.service')

const { TOKEN_PUBLIC_KEY } = require('../app/config')

const { 
  encryptPasswordUtil,
  comparePasswordUtil 
} = require('../utils/encrypt-password-util')

// 验证参数
const verifyLoginParams = async (ctx, next) => {
  const { phone, password } = ctx.request.body
  
  if (!phone) {
    throw new Error('缺少参数：phone')
  }
  if (!password) {
    throw new Error('缺少参数：password')
  }

  const adminByPhone = await AuthService.getAdminByPhone(phone)
  if (adminByPhone.length <= 0) {
    throw new Error('该手机号的admin不存在')
  } else {
    if (!comparePasswordUtil(password, adminByPhone[0].password)) {
      throw new Error('密码错误')
    }
  }

  ctx.theUser = adminByPhone[0] // 传递数据库中查出的admin

  await next()
}

const verifyToken = async (ctx, next) => {
  const authorization = ctx.headers.authorization
  
  if (!authorization) {
    throw new Error('未授权')
  }

  const token = authorization.replace('Bearer ', '')

  // 验证token
  try {
    const adminInfo = jwt.verify(token, TOKEN_PUBLIC_KEY, {
      algorithm: ["RS256"]
    })
    ctx.theUser = adminInfo
  } catch (error) {
    throw new Error('未授权')
  }
  
  await next()
}

module.exports = {
  verifyLoginParams,
  verifyToken
}