const service = require('../services/statistics.service')

class StatisticsController {

  async getSingleBatchStatistics(ctx, next) {
    const params = ctx.request.query

    const result = await service.getSingleBatchStatistics(params)

    ctx.body = result
  }
}

module.exports = new StatisticsController()