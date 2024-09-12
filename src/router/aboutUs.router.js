const Router = require('koa-router')

const AboutUsController = require('../controllers/auth.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const authRouter = new Router({prefix: '/aboutUs'})
authRouter.post('/', verifyToken, AboutUsController.authToken)

module.exports = authRouter