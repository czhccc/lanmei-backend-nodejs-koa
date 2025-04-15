const jwt = require('jsonwebtoken')

const {
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION
} = require('../app/config')

class AuthController {
  async authToken(ctx, next) { // 颁发token
    const params = ctx.request.body

    const theUser = ctx.theUser
    
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

    ctx.body = {
      phone: theUser.phone,
      token
    }
  }

}

module.exports = new AuthController()