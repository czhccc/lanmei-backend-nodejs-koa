const service = require('../services/category.service')

class CategoryController {
  async updateCategory(ctx, next) {
    const params = ctx.request.body

    const result = await service.updateCategory(params)

    ctx.body = '修改成功'
  }

  async getCategory(ctx, next) {
    const params = ctx.request.query

    const result = await service.getCategory(params)

    ctx.body = result
  }
}

module.exports = new CategoryController()