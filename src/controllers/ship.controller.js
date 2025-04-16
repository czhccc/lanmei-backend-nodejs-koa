const service = require('../services/ship.service')

const customError = require('../utils/customError')

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
      throw new customError.MissingParameterError('value')
    }
    if (!code) {
      throw new customError.MissingParameterError('code')
    }

    const result = await service.changeUsable(params)

    ctx.body = result
  }

  async getShipProvincesOfLastBatch(ctx, next) {
    const params = ctx.request.query

    const { goodsId } = params
    if (!goodsId) {
      throw new customError.MissingParameterError('goodsId')
    }

    const result = await service.getShipProvincesOfLastBatch(params)

    ctx.body = result
  }
}

module.exports = new ShipController()