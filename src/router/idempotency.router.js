const Router = require('koa-router')

const UtilController = require('../controllers/idempotency.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const utilRouter = new Router({prefix: '/util'})

utilRouter.post('/getIdempotencyKey', verifyToken, UtilController.getIdempotencyKey)
 
module.exports = utilRouter