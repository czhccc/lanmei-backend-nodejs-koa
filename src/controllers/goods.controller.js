const service = require('../services/goods.service')

class GoodsController {
  async createOrUpdateGoods(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    
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
    params.thePhone = ctx.theUser.phone
    const result = await service.endCurrentBatch(params)

    ctx.body = '操作成功'
  }

  async changeGoodsIsSelling(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.changeGoodsIsSelling(params)

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

  async getGoodsAllBatches(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }
    
    const result = await service.getGoodsBatches(params)

    ctx.body = result
  }

  async getBatchTotalInfo(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }
    
    const result = await service.getBatchTotalInfo(params)
    
    ctx.body = result
  }

  async deleteCurrentBatch(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }
    
    const result = await service.deleteCurrentBatch(params)

    ctx.body = result
  }

  async cancelAllOrdersInCurrentBatch(ctx, next) {
    const params = ctx.request.body

    const { id, cancelReason } = params
    if (!id) {
      throw new Error('缺少必填字段：商品id')
    }
    if (!cancelReason) {
      throw new Error('缺少必填字段：取消预订原因')
    }
    
    params.thePhone = ctx.theUser.phone
    const result = await service.cancelAllOrdersInCurrentBatch(params)

    ctx.body = result
  }

  async preorderBatchIsReadyToSell(ctx, next) {
    const params = ctx.request.body

    const { goodsId, finalPrice } = params
    if (!goodsId) {
      throw new Error('缺少必填字段：商品id')
    }
    if (!finalPrice) {
      throw new Error('缺少必填字段：最终定价')
    }
    
    params.thePhone = ctx.theUser.phone
    const result = await service.preorderBatchIsReadyToSell(params)

    ctx.body = result
  }
}

module.exports = new GoodsController()