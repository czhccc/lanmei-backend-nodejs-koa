const service = require('../services/aboutUs.service')

const customError = require('../utils/customError')

class AboutUsController {
  async updateAboutUs(ctx, next) {
    const params = ctx.request.body

    if (!params.aboutUs) {
      throw new customError.MissingParameterError('aboutUs')
    }

    const result = await service.updateAboutUs(params)

    ctx.body = result
  }

  async getAboutUs(ctx, next) {
    const params = ctx.request.body

    const result = await service.getAboutUs(params)

    ctx.body = result
  }
}

module.exports = new AboutUsController()