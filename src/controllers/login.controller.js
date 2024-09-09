const jwt = require('jsonwebtoken')

const {
  TOKEN_PRIVATE_KEY
} = require('../app/config')

const service = require('../services/user.service')

class LoginController {
  async login(ctx, next) {
    // 获取参数
    const params = ctx.request.body

    const theAdmin = ctx.theAdmin
    
    // 操作数据库
    // const result = await service.create(user)

    // 颁发token
    const token = jwt.sign({
      phone: theAdmin.phone,
      name: theAdmin.name,
      role: theAdmin.role
    }, 
    TOKEN_PRIVATE_KEY, 
    {
      expiresIn: 60 * 60 * 24,
      algorithm: 'RS256',
    })

    // 返回数据
    ctx.body = {
      phone: theAdmin.phone,
      name: theAdmin.name,
      token
    }
  }

  async loginSuccess(ctx, next) {
    ctx.body = 'token验证通过~'
  }
}

module.exports = new LoginController()