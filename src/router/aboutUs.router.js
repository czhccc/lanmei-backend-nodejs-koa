const Router = require('koa-router')

const AboutUsController = require('../controllers/aboutUs.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const authRouter = new Router({prefix: '/aboutUs'})
authRouter.post('/', verifyToken, AboutUsController.updateAboutUs)
authRouter.get('/', verifyToken, AboutUsController.getAboutUs)

module.exports = authRouter