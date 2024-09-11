const Router = require('koa-router')

const AdminController = require('../controllers/admin.controller')

const {
  verifyAdminCreateParams,
  encryptPassword
} = require('../middlewares/admin.middleware')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const adminRouter = new Router({prefix: '/admin'})
// adminRouter.post('/', verifyToken, verifyAdminCreateParams, encryptPassword, AdminController.createAdmin)
// adminRouter.post('/', verifyToken, AdminController.test)

adminRouter.get('/aa', verifyToken, (ctx,next)=>{
  console.log(ctx.params)
})

// adminRouter.delete('/', verifyToken, AdminController.deleteAdminByPhone)
 
module.exports = adminRouter