const service = require('../services/ship.service')

class ShipController {
  async getAll(ctx, next) {
    const params = ctx.request.query

    const result = await service.getAll(params)

    ctx.body = result
  }

  async changeUsable(ctx, next) {
    const params = ctx.request.body

    const result = await service.changeUsable(params)

    ctx.body = result
  }

  async getPostageOfLastBatch(ctx, next) {
    const params = ctx.request.query

    const result = await service.getPostageOfLastBatch(params)

    ctx.body = result
  }
}

module.exports = new ShipController()