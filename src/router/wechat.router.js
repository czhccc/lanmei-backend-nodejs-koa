const Router = require('koa-router')

const WechatController = require('../controllers/wechat.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const wechatRouter = new Router({prefix: '/wechat'})

wechatRouter.post('/getPhoneNumber', WechatController.getPhoneNumber)

wechatRouter.get('/address', verifyToken, WechatController.getAddressList)
wechatRouter.post('/address/add', verifyToken, WechatController.addAddress)
wechatRouter.post('/address/edit', verifyToken, WechatController.editAddress)
wechatRouter.post('/address/delete', verifyToken, WechatController.deleteAddress)

module.exports = wechatRouter