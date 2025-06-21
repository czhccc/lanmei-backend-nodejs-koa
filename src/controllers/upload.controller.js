const service = require('../services/upload.service')

class UploadController {
  async getCOSTemporaryKey(ctx, next) {
    const params = ctx.request.query
    const token = ctx.cookies.get('token')
    params.token = token

    const result = await service.getCOSTemporaryKey(params)
    
    ctx.body = result
  }
}

module.exports = new UploadController()