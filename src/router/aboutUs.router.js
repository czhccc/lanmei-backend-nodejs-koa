const Router = require('koa-router')

const AboutUsController = require('../controllers/aboutUs.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const aboutUsRouter = new Router({prefix: '/aboutUs'})
aboutUsRouter.post('/', verifyToken, AboutUsController.updateAboutUs)
aboutUsRouter.get('/', verifyToken, AboutUsController.getAboutUs)

module.exports = aboutUsRouter