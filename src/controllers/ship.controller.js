const service = require('../services/ship.service')

class ShipController {
  async getAll(ctx, next) {
    const params = ctx.request.query

    const result = await service.getAll(params)

    ctx.body = result
  }

  async changeUsable(ctx, next) {
    const params = ctx.request.body

    const { value, code } = params
    if (!value) {
      throw new Error('缺少参数：value')
    }
    if (!code) {
      throw new Error('缺少参数：code')
    }

    const result = await service.changeUsable(params)

    ctx.body = result
  }

  async getShipProvincesOfLastBatch(ctx, next) {
    const params = ctx.request.query

    const { goodsId } = params
    if (!goodsId) {
      throw new Error('缺少参数：goodsId')
    }

    const result = await service.getShipProvincesOfLastBatch(params)

    ctx.body = result
  }
}

module.exports = new ShipController()