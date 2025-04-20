const service = require('../services/auth.service')

class AuthController {
  async login(ctx, next) { // 颁发token
    const theUser = ctx.theUser
    
    const result = await service.login(ctx, theUser)

    ctx.body = result
  }

  async logout(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.logout(ctx, params)

    ctx.body = result
  }
}

module.exports = new AuthController()