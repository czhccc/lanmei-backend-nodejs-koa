const Router = require('koa-router')

const OrderController = require('../controllers/order.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/global/table-response-handler');

const orderRouter = new Router({prefix: '/order'})

orderRouter.post('/createOrder', verifyToken, OrderController.createOrder)

orderRouter.get('/getOrderList', verifyToken, tableResponseHandler, OrderController.getOrderList)

orderRouter.get('/getOrderDetailById', verifyToken, OrderController.getOrderDetailById)

orderRouter.post('/updateOrder', verifyToken, OrderController.updateOrder)

orderRouter.get('/getOrdersLogsList', verifyToken, tableResponseHandler, OrderController.getOrdersLogsList)

orderRouter.post('/cancelOrder', verifyToken, OrderController.cancelOrder)

orderRouter.post('/payOrder', verifyToken, OrderController.payOrder)

orderRouter.post('/completeOrder', verifyToken, OrderController.completeOrder)

orderRouter.post('/generateOrderInfo', verifyToken, OrderController.generateOrderInfo)

module.exports = orderRouter