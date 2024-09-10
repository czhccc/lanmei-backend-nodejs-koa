const service = require('../services/admin.service')

class AdminController {
  async createAdmin(ctx, next) {
    // 获取参数
    const admin = ctx.request.body

    // 操作数据库
    const result = await service.create(admin)

    // 返回数据
    ctx.body = result
  }

  async queryAdminByPhoneOrName(ctx, next) {
    const params = ctx.request.query

    const result = await service.queryAdminByPhoneOrName(params)

    ctx.body = result
  }
}

module.exports = new AdminController()