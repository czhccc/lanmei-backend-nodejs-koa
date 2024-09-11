const service = require('../services/admin.service')

class UploadController {
  async uploadFile(ctx, next) {
    const admin = ctx.request.body

    const result = await service.create(admin)

    // ctx.body = result
    ctx.body = '111'
  }
}

module.exports = new UploadController()