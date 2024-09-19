const service = require('../services/goods.service')

class GoodsController {
  async createOrUpdateGoods(ctx, next) {
    const params = ctx.request.body
    console.log(params);
    const { goodsName, goodsUnit, goodsIsSelling } = params;
    if (!goodsName || !goodsUnit || goodsIsSelling===undefined) {
      throw new Error('缺少必填字段')
    }

    if (params.id) {
      const result = await service.updateGoods(params)
      ctx.body = '修改成功'
    } else {
      const result = await service.createGoods(params)
      ctx.body = '新增成功'
    }

  }

  async getGoodsDetailById(ctx, next) {
    const params = ctx.request.query
    console.log(params);
    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段')
    }

    const result = await service.getGoodsDetailById(params)

    ctx.body = result
  }

  async getGoodsList(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getGoodsList(params)

    ctx.body = result
  }
}

module.exports = new GoodsController()