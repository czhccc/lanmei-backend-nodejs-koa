const Router = require('koa-router')

const CategoryController = require('../controllers/category.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const categoryRouter = new Router({prefix: '/category'})

categoryRouter.post('/', verifyToken, CategoryController.updateCategory)

categoryRouter.get('/', verifyToken, CategoryController.getCategory)

module.exports = categoryRouter