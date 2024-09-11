const jwt = require('jsonwebtoken')

const {
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION
} = require('../app/config')

class AuthController {
  async auth(ctx, next) {
    // 获取参数
    const params = ctx.request.body

    const theAdmin = ctx.theAdmin

    // 颁发token
    const token = jwt.sign({
      id: theAdmin.id,
      phone: theAdmin.phone,
      name: theAdmin.name,
      role: theAdmin.role
    }, 
    TOKEN_PRIVATE_KEY, 
    {
      // expiresIn: TOKEN_DURATION,
      expiresIn: 60*60*24,
      algorithm: 'RS256',
    })

    // 返回数据
    ctx.body = {
      phone: theAdmin.phone,
      name: theAdmin.name,
      token
    }
  }

  async test(ctx, next) {
    console.log('test');
    ctx.body = 'success'
  }

}

module.exports = new AuthController()