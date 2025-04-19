const Router = require('koa-router')

const AdminController = require('../controllers/admin.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const checkOlynCzhCall = require('../middlewares/checkOlynCzhCall.middleware')

const adminRouter = new Router({prefix: '/admin'})

adminRouter.post('/', verifyToken, checkOlynCzhCall, AdminController.createOrUpdateAdmin)

adminRouter.get('/', verifyToken, checkOlynCzhCall, tableResponseHandler, AdminController.getAdminList)

adminRouter.delete('/', verifyToken, checkOlynCzhCall, AdminController.deleteAdminByPhone)
 
module.exports = adminRouter