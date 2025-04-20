const Router = require('koa-router')

const MenuController = require('../controllers/menu.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const menuRouter = new Router({prefix: '/menu'})

menuRouter.get('/getMenuList', verifyToken, MenuController.getMenuList)
 
module.exports = menuRouter