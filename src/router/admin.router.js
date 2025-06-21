const Router = require('koa-router')

const AdminController = require('../controllers/admin.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const checkOlynCzhCall = require('../middlewares/checkOnlyCzhCall.middleware')

const adminRouter = new Router({prefix: '/admin'})

adminRouter.post('/createOrUpdateAdmin', verifyToken, checkOlynCzhCall, AdminController.createOrUpdateAdmin)

adminRouter.get('/getAdminList', verifyToken, checkOlynCzhCall, tableResponseHandler, AdminController.getAdminList)

adminRouter.delete('/deleteAdmin', verifyToken, checkOlynCzhCall, AdminController.deleteAdminByPhone)

adminRouter.post('/unlockAdmin', verifyToken, checkOlynCzhCall, AdminController.unlockAdmin)
 
module.exports = adminRouter