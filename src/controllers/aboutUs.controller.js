const service = require('../services/admin.service')

class AboutUsController {
  async updateAboutUs(ctx, next) {
    const params = ctx.request.body

    console.log(params);

    // ctx.body = result
    ctx.body = '111'
  }
}

module.exports = new AboutUsController()