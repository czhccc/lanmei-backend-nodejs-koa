const service = require('../services/admin.service')

class AdminController {
  async createOrUpdateAdmin(ctx, next) {
    const params = ctx.request.body

    if (params.id) {
      const result = await service.updateAdmin(params)
      ctx.body = '修改成功'
    } else {
      const result = await service.createAdmin(params)
      ctx.body = '新增成功'
    }
  }

  async getAdminList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getAdminList(params)

    ctx.body = result
  }

  async deleteAdminByPhone(ctx, next) {
    const params = ctx.request.query
    const result = await service.deleteAdminByPhone(params)

    ctx.body = '删除成功'
  }
}

module.exports = new AdminController()