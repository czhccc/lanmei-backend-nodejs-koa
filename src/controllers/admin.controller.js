const service = require('../services/user.service')

class UserController {
  async createAdmin(ctx, next) {
    // 获取参数
    const user = ctx.request.body

    // 操作数据库
    const result = await service.create(user)

    // 返回数据
    ctx.body = result
  }
}

module.exports = new UserController()