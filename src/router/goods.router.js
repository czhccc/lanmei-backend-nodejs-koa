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

goodsRouter.get('/getGoodsDetailById', verifyToken, GoodsController.getGoodsDetailById)

goodsRouter.get('/getGoodsList', verifyToken, tableResponseHandler, GoodsController.getGoodsList)

goodsRouter.post('/endCurrentBatch', verifyToken, GoodsController.endCurrentBatch)

goodsRouter.post('/changeGoodsIsSelling', verifyToken, GoodsController.changeGoodsIsSelling)

goodsRouter.get('/getHistoryBatchesList', verifyToken, tableResponseHandler, GoodsController.getHistoryBatchesList)


module.exports = goodsRouter