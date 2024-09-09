const Router = require('koa-router')

const loginController = require('../controllers/login.controller')

const {
  verifyLoginParams,
  verifyToken
} = require('../middlewares/login.middleware')

const loginRouter = new Router({prefix: '/login'})
loginRouter.post('/', verifyLoginParams, loginController.login)
loginRouter.get('/', verifyToken, loginController.loginSuccess)

module.exports = loginRouter