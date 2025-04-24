const service = require('../services/goods.service')

const {
  enum_goods_batchType,
  enum_media_fileType,
  enum_media_useType
} = require('../app/enum')

const customError = require('../utils/customError')

class GoodsController {
  async createOrUpdateGoods(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    
    const { goodsName, goodsUnit, goodsIsSelling } = params;
    if (!goodsName) {
      throw new customError.MissingParameterError('goodsName')
    }
    if (!goodsUnit) {
      throw new customError.MissingParameterError('goodsUnit')
    }
    if (goodsIsSelling===undefined) {
      throw new customError.MissingParameterError('goodsIsSelling')
    }

    if (params.goodsId) {
      const { goodsId, goodsName, goodsUnit, goodsCategoryId, batchType, batchDiscountsPromotion, batchExtraOptions, batchShipProvinces } = params;

      if (!goodsId) {
        throw new customError.MissingParameterError('goodsId')
      }
      if (!goodsName?.trim()) {
        throw new customError.MissingParameterError('goodsName')
      }
      if (!goodsUnit?.trim()) {
        throw new customError.MissingParameterError('goodsUnit')
      }
      if (!goodsCategoryId) {
        throw new customError.MissingParameterError('goodsCategoryId')
      }
      
      if (batchType && !enum_goods_batchType[batchType]) {
        throw new customError.InvalidParameterError('batchType')
      }

      if (params.batchType) {
        // 校验满减优惠
        if (batchDiscountsPromotion?.length > 0) {
          const quantitySet = new Set();
        
          for (const item of batchDiscountsPromotion) {
            if (item.quantity===null || item.quantity===undefined) {
              throw new customError.InvalidParameterError('quantity', '优惠策略 数量 未填写完整')
            }
            if (item.quantity < 0) {
              throw new customError.InvalidParameterError('quantity', '优惠策略 数量 须大于等于 0')
            }
            if (item.discount===null || item.discount===undefined) {
              throw new customError.InvalidParameterError('discount', '优惠策略 优惠金额 未填写完整')
            }
            if (item.discount <= 0) {
              throw new customError.InvalidParameterError('discount', '优惠策略 优惠金额 须大于 0')
            }
        
            if (quantitySet.has(item.quantity)) {
              throw new customError.InvalidParameterError('quantity', `优惠策略中数量 "${item.quantity}" 重复`)
            }
        
            quantitySet.add(item.quantity);
          }
        }

        // 校验额外选项
        if (batchExtraOptions?.length > 0) { 
          const contentSet = new Set();

          for (const item of batchExtraOptions) {
            if (item.content===null || item.content===undefined || item.content.trim()==='') {
              throw new customError.InvalidParameterError('content', '额外选项 内容 未填写完整')
            }
            if (item.amount===null || item.amount===undefined) {
              throw new customError.InvalidParameterError('amount', '额外选项 金额 未填写完整')
            }
            if (item.amount < 0) {
              throw new customError.InvalidParameterError('amount', '额外选项 金额 须大于等于 0')
            }

            if (contentSet.has(item.content)) {
              throw new customError.InvalidParameterError('content', `额外选项中内容 "${item.content}" 重复`)
            }
        
            contentSet.add(item.content);
          }
        }

        // 校验邮费规则
        if (batchShipProvinces.length === 0) {
          throw new customError.InvalidParameterError('batchShipProvinces', '邮费规则 不能为空')
        }
        for (const province of batchShipProvinces) {
          if (province.freeShippingQuantity === 1) continue; // 1个就包邮

          const validations = [
            { field: 'baseQuantity', content: '首重最大数量' },
            { field: 'basePostage', content: '首重邮费' },
            { field: 'extraQuantity', content: '每续重几件' },
            { field: 'extraPostage', content: '续重单位邮费' },
            { field: 'freeShippingQuantity', content: '包邮数量' }
          ];

          if (province.baseQuantity > province.freeShippingQuantity) {
            throw new customError.InvalidParameterError('baseQuantity', `${province.name} 首重最大数量须小于等于包邮数量`)
          }

          for (const { field, content } of validations) {
            const value = province[field];
            if (value===undefined || value===null) {
              throw new customError.InvalidParameterError(field, `${province.name} ${content} 未填写`)
            }
            if (value === 0) {
              throw new customError.InvalidParameterError(field, `${province.name} ${content} 须大于 0`)
            }
          }
        }
      }

      const result = await service.updateGoods(params)

      ctx.body = result
    } else {
      const { goodsName, goodsUnit, goodsCategoryId } = params;

      if (!goodsName?.trim()) {
        throw new customError.MissingParameterError('goodsName')
      }
      if (!goodsUnit?.trim()) {
        throw new customError.MissingParameterError('goodsUnit')
      }
      if (!goodsCategoryId) {
        throw new customError.MissingParameterError('goodsCategoryId')
      }

      const result = await service.createGoods(params)

      ctx.body = result
    }

  }

  async getGoodsDetailById(ctx, next) {
    const params = ctx.request.query
    
    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }

    const result = await service.getGoodsDetailById(params)

    ctx.body = result
  }

  async getGoodsList(ctx, next) {
    const params = ctx.request.query
    
    const result = await service.getGoodsList(params)

    ctx.body = result
  }

  async getGoodsListForWechat(ctx, next) {
    const params = ctx.request.body
    
    const result = await service.getGoodsListForWechat(params)

    ctx.body = result
  }

  async endCurrentBatch(ctx, next) {
    const params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { goodsId } = params
    if (!thePhone) {
      throw new customError.MissingParameterError('thePhone')
    }
    if (!goodsId) {
      throw new customError.MissingParameterError('goodsId')
    }

    const result = await service.endCurrentBatch(params)

    ctx.body = result
  }

  async changeGoodsIsSelling(ctx, next) {
    const params = ctx.request.body

    const { id, value } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (typeof value === 'undefined') {
      throw new customError.MissingParameterError('value')
    }
    if (typeof value !== 'number' || (value !== 0 && value !== 1)) {
      throw new customError.InvalidParameterError('value', '上架状态值必须为 0 或 1')
    }
    
    const result = await service.changeGoodsIsSelling(params)

    ctx.body = result
  }

  async getHistoryBatchesList(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    
    const result = await service.getHistoryBatchesList(params)

    ctx.body = result
  }

  async getBatchTotalInfo(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    
    const result = await service.getBatchTotalInfo(params)
    
    ctx.body = result
  }

  async deleteCurrentBatch(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    
    const result = await service.deleteCurrentBatch(params)

    ctx.body = result
  }

  async cancelAllOrdersInCurrentBatch(ctx, next) {
    const params = ctx.request.body

    const { id, cancelReason } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (!cancelReason?.trim()) {
      throw new customError.MissingParameterError('cancelReason')
    }
    
    params.thePhone = ctx.theUser.phone
    const result = await service.cancelAllOrdersInCurrentBatch(params)

    ctx.body = result
  }
  
  async preorderBatchIsReadyToSell(ctx, next) {
    const params = ctx.request.body

    const { goodsId, finalPrice } = params
    if (!goodsId) {
      throw new customError.MissingParameterError('goodsId')
    }
    if (!finalPrice) {
      throw new customError.MissingParameterError('finalPrice')
    }
    if (typeof goodsId !== 'number' || goodsId <= 0) {
      throw new customError.InvalidParameterError('goodsId')
    }
    if (typeof finalPrice !== 'number' || finalPrice <= 0) {
      throw new customError.InvalidParameterError('finalPrice')
    }

    params.thePhone = ctx.theUser.phone
    const result = await service.preorderBatchIsReadyToSell(params)

    ctx.body = result
  }

  async getGoodsStockRemainingQuantityFromRedis(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    
    const result = await service.getGoodsStockRemainingQuantityFromRedis(params)

    ctx.body = result
  }
}

module.exports = new GoodsController()