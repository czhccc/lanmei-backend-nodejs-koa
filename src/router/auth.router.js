const Router = require('koa-router')

const AuthController = require('../controllers/auth.controller')

const {
  verifyLoginParams,
} = require('../middlewares/auth.middleware')

const authRouter = new Router({prefix: '/login'})
authRouter.post('/', verifyLoginParams, AuthController.auth)
// authRouter.get('/', AuthController.test)

module.exports = authRouter