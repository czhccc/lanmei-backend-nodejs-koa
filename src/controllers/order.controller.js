const service = require('../services/order.service')

class OrderController {
  async createOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    
    const result = await service.createOrder(params)
    
    ctx.body = result
  }

  async getOrderList(ctx, next) {
    const params = ctx.request.query

    const result = await service.getOrderList(params)

    ctx.body = result
  }

  async getOrderDetailById(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getOrderDetailById(params)

    ctx.body = result
  }

  async updateOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    const result = await service.updateOrder(params)

    ctx.body = result
  }

  async getOrderLogsList(ctx, next) {
    const params = ctx.request.query
    params.thePhone = ctx.theUser.phone
    const result = await service.getOrderLogsList(params)

    ctx.body = result
  }

  async cancelSingleReservedOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    const result = await service.cancelSingleReservedOrder(params)

    ctx.body = result
  }

  async payOrder(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.payOrder(params)

    ctx.body = result
  }

  async completeOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    const result = await service.completeOrder(params)

    ctx.body = result
  }
}

module.exports = new OrderController()