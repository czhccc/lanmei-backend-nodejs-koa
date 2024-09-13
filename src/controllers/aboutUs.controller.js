const service = require('../services/aboutUs.service')

class AboutUsController {
  async updateAboutUs(ctx, next) {
    const params = ctx.request.body

    const result = await service.updateAboutUs(params)

    ctx.body = '修改成功'
  }

  async getAboutUs(ctx, next) {
    const params = ctx.request.body

    const result = await service.getAboutUs(params)

    ctx.body = result
  }
}

module.exports = new AboutUsController()