const Router = require('koa-router')

const CategoryController = require('../controllers/category.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const categoryRouter = new Router({prefix: '/category'})

categoryRouter.post('/', verifyToken, CategoryController.updateCategory)

categoryRouter.get('/list', CategoryController.getCategory)

categoryRouter.get('/listForWechat', CategoryController.getCategoryForWechat)

module.exports = categoryRouter