const jwt = require('jsonwebtoken')

const {
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION
} = require('../app/config')

class AuthController {
  async authToken(ctx, next) { // 颁发token
    const params = ctx.request.body

    const theAdmin = ctx.theAdmin
    
    const token = jwt.sign({ // admin信息
      id: theAdmin.id,
      phone: theAdmin.phone,
      name: theAdmin.name,
      role: theAdmin.role
    }, 
    TOKEN_PRIVATE_KEY,
    {
      expiresIn: TOKEN_DURATION,
      algorithm: 'RS256',
    })

    const decodedToken = jwt.decode(token); 

    ctx.body = {
      phone: theAdmin.phone,
      name: theAdmin.name,
      token
    }
  }

}

module.exports = new AuthController()