const Router = require('koa-router')

const WxpayController = require('../controllers/wxpay.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const wxpayRouter = new Router({prefix: '/wxpay'})

wxpayRouter.post('/getWxpayParams', verifyToken, WxpayController.getWxpayParams)

module.exports = wxpayRouter