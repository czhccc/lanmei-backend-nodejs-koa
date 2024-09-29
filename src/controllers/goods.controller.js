const service = require('../services/goods.service')

class GoodsController {
  async createOrUpdateGoods(ctx, next) {
    const params = ctx.request.body
    
    const { goodsName, goodsUnit, goodsIsSelling } = params;
    if (!goodsName || !goodsUnit || goodsIsSelling===undefined) {
      throw new Error('缺少必填字段')
    }

    if (params.goodsId) {
      const result = await service.updateGoods(params)
      ctx.body = '修改成功'
    } else {
      const goodsId = await service.createGoods(params)
      ctx.body = {
        goodsId
      }
    }

  }

  async getGoodsDetailById(ctx, next) {
    const params = ctx.request.query
    
    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }

    const result = await service.getGoodsDetailById(params)

    ctx.body = result
  }

  async getGoodsList(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getGoodsList(params)

    ctx.body = result
  }

  async endCurrentBatch(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.endCurrentBatch(params)

    ctx.body = '操作成功'
  }

  async getHistoryBatchesList(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }
    
    const result = await service.getHistoryBatchesList(params)

    ctx.body = result
  }
}

module.exports = new GoodsController()