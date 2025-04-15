const service = require('../services/order.service')

class OrderController {
  async createOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { goods_id, quantity, receive_provinceCode, receive_cityCode, receive_districtCode, receive_address, receive_name, receive_phone } = params
    if (!goods_id) {
      throw new Error('缺少参数：goods_id')
    }
    if (!(Number.isInteger(quantity) && quantity>0)) {
      throw new Error('商品数量必须为正整数')
    }
    if (!receive_provinceCode || !receive_cityCode || !receive_districtCode || !receive_address.trim() || !receive_name || !receive_phone) {
      throw new Error('收货信息不完整')
    }
    
    const result = await service.createOrder(params)
    
    ctx.body = result
  }

  async updateOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { id } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }

    const result = await service.updateOrder(params)

    ctx.body = result
  }

  async getOrderList(ctx, next) {
    const params = ctx.request.query

    const result = await service.getOrderList(params)

    ctx.body = result
  }

  async getOrderDetailById(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }
    
    const result = await service.getOrderDetailById(params)

    ctx.body = result
  }

  async cancelOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { orderId } = params
    if (!orderId) {
      throw new Error('缺少参数：orderId')
    }

    const result = await service.cancelOrder(params)

    ctx.body = result
  }

  async payOrder(ctx, next) {
    const params = ctx.request.body

    const { orderId } = params
    if (!orderId) {
      throw new Error('缺少参数：orderId');
    }
    
    const result = await service.payOrder(params)

    ctx.body = result
  }

  async shipOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { orderId, trackingNumber } = params
    if (!orderId) {
      throw new Error('缺少参数：orderId');
    }
    if (!trackingNumber) {
      throw new Error('缺少参数：trackingNumber');
    }

    const result = await service.shipOrder(params)

    ctx.body = result
  }

  async completeOrder(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { orderId } = params
    if (!orderId) {
      throw new Error('缺少参数：orderId');
    }

    const result = await service.completeOrder(params)

    ctx.body = result
  }

  async generateOrderInfo(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    
    // generateOrderInfo有直接被其他createOrder service内部使用，参数校验直接放service里

    const result = await service.generateOrderInfo(params)

    ctx.body = result
  }

  async getOrdersLogsList(ctx, next) {
    const params = ctx.request.query
    params.thePhone = ctx.theUser.phone
    
    const result = await service.getOrdersLogsList(params)

    ctx.body = result
  }
}

module.exports = new OrderController()