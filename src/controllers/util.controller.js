const service = require('../services/util.service')

const logger = require('../utils/logger');

class UtilController {
  async getIdempotencyKey(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { keyParams, keyPrefix } = params
    if (!keyParams) {
      throw new Error('缺少参数: keyParams');
    }
    if (!keyPrefix) {
      throw new Error('缺少参数: keyPrefix');
    }

    const result = await service.getIdempotencyKey(params)

    ctx.body = result
  }
}

module.exports = new UtilController()