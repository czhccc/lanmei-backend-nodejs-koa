const Router = require('koa-router')

const WechatController = require('../controllers/wechat.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/global/table-response-handler');

const wechatRouter = new Router({prefix: '/wechat'})

wechatRouter.post('/getPhoneNumber', WechatController.getPhoneNumber)

// 用户收货地址
wechatRouter.get('/address', verifyToken, WechatController.getAddressList)
wechatRouter.post('/address/add', verifyToken, WechatController.addAddress)
wechatRouter.post('/address/edit', verifyToken, WechatController.editAddress)
wechatRouter.post('/address/delete', verifyToken, WechatController.deleteAddress)

// 用户首页通知
wechatRouter.get('/notify', verifyToken, tableResponseHandler, WechatController.getNotificationList)
wechatRouter.post('/notify', verifyToken, WechatController.notify)
wechatRouter.get('/notify/getLatestNotification', verifyToken, WechatController.getLatestNotification)

module.exports = wechatRouter