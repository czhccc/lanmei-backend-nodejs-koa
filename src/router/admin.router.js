const Router = require('koa-router')

const AdminController = require('../controllers/admin.controller')

const {
  verifyAdminParams,
  encryptPassword
} = require('../middlewares/admin.middleware')

const adminRouter = new Router({prefix: '/admin'})
adminRouter.post('/', verifyAdminParams, encryptPassword, AdminController.createAdmin) // 注册接口，具体的处理逻辑在controller中
 
module.exports = adminRouter