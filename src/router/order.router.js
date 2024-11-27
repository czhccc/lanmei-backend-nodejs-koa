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

orderRouter.get('/getOrderLogsList', verifyToken, tableResponseHandler, OrderController.getOrderLogsList)

module.exports = orderRouter