const Router = require('koa-router')

const GoodsController = require('../controllers/goods.controller')

// const {
  
// } = require('../middlewares/goods.middleware')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/global/table-response-handler');

const goodsRouter = new Router({prefix: '/goods'})
goodsRouter.post('/', verifyToken, GoodsController.createOrUpdateGoods)
 
module.exports = goodsRouter