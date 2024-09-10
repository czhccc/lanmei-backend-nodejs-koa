const Router = require('koa-router')

const authController = require('../controllers/auth.controller')

const {
  verifyLoginParams,
  verifyToken
} = require('../middlewares/auth.middleware')

const authRouter = new Router({prefix: '/login'})
authRouter.post('/', verifyLoginParams, authController.auth)

module.exports = authRouter