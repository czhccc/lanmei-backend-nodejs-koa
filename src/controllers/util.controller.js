const service = require('../services/util.service')

const logger = require('../utils/logger');

const customError = require('../utils/customError')

class UtilController {
  async getIdempotencyKey(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { keyParams, keyPrefix } = params
    if (!keyParams) {
      throw new customError.MissingParameterError('keyParams')
    }
    if (!keyPrefix) {
      throw new customError.MissingParameterError('keyPrefix')
    }

    const result = await service.getIdempotencyKey(params)

    ctx.body = result
  }
}

module.exports = new UtilController()