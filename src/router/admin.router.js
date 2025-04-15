const Router = require('koa-router')

const AdminController = require('../controllers/admin.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const adminRouter = new Router({prefix: '/admin'})

adminRouter.post('/', verifyToken, AdminController.createOrUpdateAdmin)

adminRouter.get('/', verifyToken, tableResponseHandler, AdminController.getAdminList)

adminRouter.delete('/', verifyToken, AdminController.deleteAdminByPhone)
 
module.exports = adminRouter