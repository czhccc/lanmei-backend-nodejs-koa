const service = require('../services/menu.service')

class MenuController {
  async getMenuList(ctx, next) {
    const params = ctx.request.query
    params.thePhone = ctx.theUser.phone

    const result = await service.getMenuList(params)

    ctx.body = result
  }
}

module.exports = new MenuController()