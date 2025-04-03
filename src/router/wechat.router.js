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
wechatRouter.get('/address/default', verifyToken, WechatController.getDefaultAddress)

// 用户首页通知
wechatRouter.get('/notify', verifyToken, tableResponseHandler, WechatController.getNotificationList)
wechatRouter.post('/notify', verifyToken, WechatController.notify)
wechatRouter.get('/notify/getLatestNotification', WechatController.getLatestNotification)

// 首页推荐轮播图
wechatRouter.get('/recommend', WechatController.getRecommendList)
wechatRouter.post('/recommend', verifyToken, WechatController.editRecommendList)

// 资讯
wechatRouter.get('/news/list', tableResponseHandler, WechatController.getNewsList)
wechatRouter.get('/news/detail', WechatController.getNewsDetail)
wechatRouter.post('/news/add', verifyToken, WechatController.addNews)
wechatRouter.post('/news/edit', verifyToken, WechatController.editNews)
wechatRouter.post('/news/delete', verifyToken, WechatController.deleteNews)
wechatRouter.post('/news/show', verifyToken, WechatController.showNews)
wechatRouter.post('/news/pin', verifyToken, WechatController.pinNews)

module.exports = wechatRouter