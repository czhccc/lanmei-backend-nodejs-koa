const service = require('../services/wxpay.service')

const customError = require('../utils/customError')

class WxpayController {
  async getWxpayParams(ctx, next) {
    const params = ctx.request.body

    const { code, orderNo } = params

    if (!code) {
      throw new customError.MissingParameterError('code')
    }
    if (!orderNo) {
      throw new customError.MissingParameterError('orderNo')
    }

    const result = await service.getWxpayParams(params)

    ctx.body = result
  }
}

module.exports = new WxpayController()