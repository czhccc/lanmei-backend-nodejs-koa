const service = require('../services/admin.service')

class AdminController {
  async createAdmin(ctx, next) {
    console.log('createAdmin');
    const admin = ctx.request.body

    const result = await service.create(admin)

    ctx.body = result
  }

  async queryAdminByPhoneOrName(ctx, next) {
    console.log('queryAdminByPhoneOrName');
    const params = ctx.request.query
    const result = await service.queryAdminByPhoneOrName(params)

    ctx.body = result
  }

  async deleteAdminByPhone(ctx, next) {
    const params = ctx.request.query
    console.log('controller', params);
    const result = await service.deleteAdminByPhone(params)

    ctx.body = result
  }

  async test(ctx, next) {
    ctx.body = 'success!!'
  }
}

module.exports = new AdminController()