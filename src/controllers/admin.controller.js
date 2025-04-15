const service = require('../services/admin.service')

class AdminController {
  async createOrUpdateAdmin(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const {phone, name, role, password} = params

    if (params.id) {
      if (!phone) {
        throw new Error('缺少参数：phone')
      }
      if (!name && !password && !role) {
        throw new Error('无更新的字段')
      }
      if (role && !enum_admin_role[role]) {
        throw new Error('参数格式错误：role')
      }
      if (password.length < 6) {
        throw new Error('密码不得少于6位')
      }

      const result = await service.updateAdmin(params)

      ctx.body = result
    } else {
      if (!phone) {
        throw new Error('缺少参数: phone');
      }
      if (!name) {
        throw new Error('缺少参数: name');
      }
      if (!role) {
        throw new Error('缺少参数: role');
      }
      if (!enum_admin_role[role]) {
        throw new Error('参数格式错误：role')
      }
      if (password.length < 6) {
        throw new Error('密码不得少于6位')
      }

      const result = await service.createAdmin(params)

      ctx.body = result
    }
  }

  async getAdminList(ctx, next) {
    const params = ctx.request.query

    const result = await service.getAdminList(params)

    ctx.body = result
  }

  async deleteAdminByPhone(ctx, next) {
    const params = ctx.request.query

    const { phone } = params

    if (!phone) {
      throw new Error('缺少参数：phone')
    }

    const result = await service.deleteAdminByPhone(params)

    ctx.body = result
  }
}

module.exports = new AdminController()