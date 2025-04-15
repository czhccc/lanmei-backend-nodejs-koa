const Router = require('koa-router')

const OrderController = require('../controllers/order.controller')

const { verifyToken } = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const checkIdempotencyKey = require('../middlewares/checkIdempotencyKey')

const orderRouter = new Router({prefix: '/order'})

orderRouter.post('/createOrder', verifyToken, checkIdempotencyKey, OrderController.createOrder)

orderRouter.get('/getOrderList', verifyToken, tableResponseHandler, OrderController.getOrderList)

orderRouter.get('/getOrderDetailById', verifyToken, OrderController.getOrderDetailById)

orderRouter.post('/updateOrder', verifyToken, OrderController.updateOrder)

orderRouter.get('/getOrdersLogsList', verifyToken, tableResponseHandler, OrderController.getOrdersLogsList)

orderRouter.post('/cancelOrder', verifyToken, checkIdempotencyKey, OrderController.cancelOrder)

orderRouter.post('/payOrder', verifyToken, checkIdempotencyKey, OrderController.payOrder)

orderRouter.post('/shipOrder', verifyToken, checkIdempotencyKey, OrderController.shipOrder)

orderRouter.post('/completeOrder', checkIdempotencyKey, verifyToken, OrderController.completeOrder)

orderRouter.post('/generateOrderInfo', verifyToken, OrderController.generateOrderInfo)

module.exports = orderRouter