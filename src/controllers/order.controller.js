const service = require('../services/order.service')

class OrderController {
  async createOrder(ctx, next) {
    const params = ctx.request.body

    const result = await service.createOrder(params)

    ctx.body = '操作成功'
  }

  async getOrderList(ctx, next) {
    const params = ctx.request.query

    const result = await service.getOrderList(params)

    ctx.body = result
  }
}

module.exports = new OrderController()