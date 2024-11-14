const Router = require('koa-router')

const OrderController = require('../controllers/order.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const orderRouter = new Router({prefix: '/order'})

orderRouter.post('/createOrder', verifyToken, OrderController.createOrder)

orderRouter.get('/getOrderList', verifyToken, OrderController.getOrderList)

module.exports = orderRouter