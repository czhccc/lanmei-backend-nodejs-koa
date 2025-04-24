const Router = require('koa-router')

const GoodsController = require('../controllers/goods.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const goodsRouter = new Router({prefix: '/goods'})
goodsRouter.post('/', verifyToken, GoodsController.createOrUpdateGoods)

goodsRouter.get('/getGoodsDetailById', GoodsController.getGoodsDetailById)

goodsRouter.get('/getGoodsList', tableResponseHandler, GoodsController.getGoodsList)

goodsRouter.post('/getGoodsListForWechat', GoodsController.getGoodsListForWechat)

goodsRouter.post('/endCurrentBatch', verifyToken, GoodsController.endCurrentBatch)

goodsRouter.post('/changeGoodsIsSelling', verifyToken, GoodsController.changeGoodsIsSelling)

goodsRouter.get('/getHistoryBatchesList', verifyToken, tableResponseHandler, GoodsController.getHistoryBatchesList)

goodsRouter.get('/getBatchTotalInfo', verifyToken, GoodsController.getBatchTotalInfo)

goodsRouter.delete('/deleteCurrentBatch', verifyToken, GoodsController.deleteCurrentBatch)

goodsRouter.post('/cancelAllOrdersInCurrentBatch', verifyToken, GoodsController.cancelAllOrdersInCurrentBatch)

goodsRouter.post('/preorderBatchIsReadyToSell', verifyToken, GoodsController.preorderBatchIsReadyToSell)

goodsRouter.get('/getGoodsStockRemainingQuantityFromRedis', verifyToken, GoodsController.getGoodsStockRemainingQuantityFromRedis)


module.exports = goodsRouter