const service = require('../services/systemLogs.service')

class SystemLogsController {
  async getSystemLogsList(ctx, next) {
    const params = ctx.request.query

    const result = await service.getSystemLogsList(params)

    ctx.body = result
  }

  async deleteSystemLogs(ctx, next) {
    const params = ctx.request.body

    const { ids } = params
    if (!ids) {
      throw new customError.MissingParameterError('ids')
    }
    if (!Array.isArray(ids)) {
      throw new customError.InvalidParameterError('ids', 'ids必须是数组')
    }

    const result = await service.deleteSystemLogs(params)

    ctx.body = result
  }

  async deleteSystemLogsByTime(ctx, next) {
    const params = ctx.request.body
    
    const { startTime, endTime } = params
    if (!startTime) {
      throw new customError.MissingParameterError('startTime')
    }
    if (!endTime) {
      throw new customError.MissingParameterError('endTime')
    }

    const result = await service.deleteSystemLogsByTime(params)

    ctx.body = result
  }
}

module.exports = new SystemLogsController()