const service = require('../services/category.service')

class CategoryController {
  async updateCategory(ctx, next) {
    const params = ctx.request.body

    const { categoryList } = params
    if (!categoryList) {
      throw new Error('缺少参数: categoryList')
    }

    const result = await service.updateCategory(params)

    ctx.body = result
  }

  async getCategory(ctx, next) {
    const params = ctx.request.query

    const result = await service.getCategory(params)

    ctx.body = result
  }

  async getCategoryForWechat(ctx, next) {
    const params = ctx.request.query

    const result = await service.getCategoryForWechat(params)

    ctx.body = result
  }
}

module.exports = new CategoryController()