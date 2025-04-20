const Router = require('koa-router')

const AuthController = require('../controllers/auth.controller')

const {
  verifyLoginParams,
} = require('../middlewares/auth.middleware')

const authRouter = new Router({prefix: '/auth'})

authRouter.post('/login', verifyLoginParams, AuthController.login)

authRouter.post('/logout', AuthController.logout)

module.exports = authRouter