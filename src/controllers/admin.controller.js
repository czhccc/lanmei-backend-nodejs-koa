const service = require('../services/admin.service')

const customError = require('../utils/customError')

const { enum_admin_role } = require('../app/enum')

const { czhAdminPhone } = require('../app/config')

const logger = require('../utils/logger')

class AdminController {
  async createOrUpdateAdmin(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const {phone, name, role, password} = params

    if (params.id) {
      if (!phone) {
        throw new customError.MissingParameterError('phone')
      }
      if (!name && !password && !role) {
        throw new customError.InvalidLogicError('无可更新的字段')
      }
      if (role && !enum_admin_role[role]) {
        throw new customError.MissingParameterError('role')
      }
      if (password.length < 6) {
        throw new customError.InvalidParameterError('password', '密码长度不得少于6位')
      }

      const result = await service.updateAdmin(params)

      ctx.body = result
    } else {
      if (!phone) {
        throw new customError.MissingParameterError('phone')
      }
      if (!name) {
        throw new customError.MissingParameterError('name')
      }
      if (!role) {
        throw new customError.MissingParameterError('role')
      }
      if (!enum_admin_role[role]) {
        throw new customError.InvalidParameterError('role')
      }
      if (password.length < 6) {
        throw new customError.InvalidParameterError('password', '密码长度不得少于6位')
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
    const params = ctx.request.body

    const { phone } = params

    if (!phone) {
      throw new customError.MissingParameterError('phone')
    }

    const result = await service.deleteAdminByPhone(params)

    ctx.body = result
  }

  async unlockAdmin(ctx, next) {
    const params = ctx.request.body

    const { phone } = params

    if (!phone) {
      throw new customError.MissingParameterError('phone')
    }

    const result = await service.unlockAdmin(params)

    ctx.body = result
  }
}

module.exports = new AdminController()