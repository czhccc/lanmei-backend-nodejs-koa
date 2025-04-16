const service = require('../services/wechat.service')

const customError = require('../utils/customError')

class WechatController {
  async getPhoneNumber(ctx, next) {
    const params = ctx.request.body

    const result = await service.getPhoneNumber(params)

    ctx.body = result
  }

  // 用户收货地址
  async addAddress(ctx, next) {
    const params = ctx.request.body

    const { name, phone, provinceCode, cityCode, districtCode, detail } = params
    if (!name) {
      throw new customError.MissingParameterError('name')
    }
    if (!phone) {
      throw new customError.MissingParameterError('phone')
    }
    if (!provinceCode) {
      throw new customError.MissingParameterError('provinceCode')
    }
    if (!cityCode) {
      throw new customError.MissingParameterError('cityCode')
    }
    if (!districtCode) {
      throw new customError.MissingParameterError('districtCode')
    }
    if (!detail) {
      throw new customError.MissingParameterError('detail')
    }

    const result = await service.addAddress(params)

    ctx.body = result
  }
  async editAddress(ctx, next) {
    const params = ctx.request.body

    const { id, name, phone, provinceCode, cityCode, districtCode, detail } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (!name) {
      throw new customError.MissingParameterError('name')
    }
    if (!phone) {
      throw new customError.MissingParameterError('phone')
    }
    if (!provinceCode) {
      throw new customError.MissingParameterError('provinceCode')
    }
    if (!cityCode) {
      throw new customError.MissingParameterError('cityCode')
    }
    if (!districtCode) {
      throw new customError.MissingParameterError('districtCode')
    }
    if (!detail) {
      throw new customError.MissingParameterError('detail')
    }

    const result = await service.editAddress(params)

    ctx.body = result
  }
  async getAddressList(ctx, next) {
    const params = ctx.request.query

    const { create_by } = params
    if (!create_by) {
      throw new customError.MissingParameterError('create_by')
    }

    const result = await service.getAddressList(params)

    ctx.body = result
  }
  async deleteAddress(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }

    const result = await service.deleteAddress(params)

    ctx.body = result
  }
  async getDefaultAddress(ctx, next) {
    const params = ctx.request.query

    const { create_by } = params
    if (!create_by) {
      throw new customError.MissingParameterError('create_by')
    }

    const result = await service.getDefaultAddress(params)

    ctx.body = result
  }

  // 用户首页通知
  async notify(ctx, next) {
    let params = ctx.request.body
    params.thePhone = ctx.theUser.phone

    const { content } = params
    if (!content) {
      throw new customError.MissingParameterError('content')
    }

    const result = await service.notify(params)

    ctx.body = result
  }
  async getNotificationList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getNotificationList(params)
    ctx.body = result
  }
  async getLatestNotification(ctx, next) {
    let params = ctx.request.query
    const result = await service.getLatestNotification(params)
    ctx.body = result
  }

  // 首页推荐轮播图
  async getRecommendList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getRecommendList(params)
    ctx.body = result
  }
  async editRecommendList(ctx, next) {
    let params = ctx.request.body

    const { list } = params
    if (!list) {
      throw new customError.MissingParameterError('list')
    }
    
    const result = await service.editRecommendList(params)

    ctx.body = result
  }

  // 资讯
  async getNewsList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getNewsList(params)
    ctx.body = result
  }
  async getNewsListForWechat(ctx, next) {
    const params = ctx.request.query
    const result = await service.getNewsListForWechat(params)
    ctx.body = result
  }
  async getNewsDetail(ctx, next) {
    const params = ctx.request.query

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }

    const result = await service.getNewsDetail(params)

    ctx.body = result
  }
  async addNews(ctx, next) {
    const params = ctx.request.body

    const { title, content } = params
    if (!title) {
      throw new customError.MissingParameterError('title')
    }
    if (!content) {
      throw new customError.MissingParameterError('content')
    }

    const result = await service.addNews(params)

    ctx.body = result
  }
  async editNews(ctx, next) {
    const params = ctx.request.body

    const { id, title, content } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (!title?.trim()) {
      throw new customError.MissingParameterError('title')
    }
    if (!content?.trim()) {
      throw new customError.MissingParameterError('content')
    }

    const result = await service.editNews(params)

    ctx.body = result
  }
  async deleteNews(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }

    const result = await service.deleteNews(params)

    ctx.body = result
  }
  async showNews(ctx, next) {
    const params = ctx.request.body

    const { id, value } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (value === undefined) {
      throw new customError.MissingParameterError('value')
    }

    const result = await service.showNews(params)

    ctx.body = result
  }
  async pinNews(ctx, next) {
    const params = ctx.request.body

    const { id, value } = params
    if (!id) {
      throw new customError.MissingParameterError('id')
    }
    if (value === undefined) {
      throw new customError.MissingParameterError('value')
    }

    const result = await service.pinNews(params)

    ctx.body = result
  }
}

module.exports = new WechatController()