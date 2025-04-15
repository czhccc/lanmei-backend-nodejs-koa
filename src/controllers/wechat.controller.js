const service = require('../services/wechat.service')

class WechatController {
  static accessTokenCache = {
    accessToken: null,
    expireTime: null,
  }

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
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    const result = await service.addAddress(params)

    ctx.body = result
  }
  async editAddress(ctx, next) {
    const params = ctx.request.body

    const { id, name, phone, provinceCode, cityCode, districtCode, detail } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (!name) {
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    const result = await service.editAddress(params)

    ctx.body = result
  }
  async getAddressList(ctx, next) {
    const params = ctx.request.query

    const { create_by } = params
    if (!create_by) {
      throw new Error('缺少参数：create_by')
    }

    const result = await service.getAddressList(params)

    ctx.body = result
  }
  async deleteAddress(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }

    const result = await service.deleteAddress(params)

    ctx.body = result
  }
  async getDefaultAddress(ctx, next) {
    const params = ctx.request.query

    const { create_by } = params
    if (!create_by) {
      throw new Error('缺少参数：create_by')
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
      throw new Error('缺少参数：content')
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
      throw new Error('缺少参数：list')
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
      throw new Error('缺少参数：id')
    }

    const result = await service.getNewsDetail(params)

    ctx.body = result
  }
  async addNews(ctx, next) {
    const params = ctx.request.body

    const { title, content } = params
    if (!title) {
      throw new Error('缺少参数：title')
    }
    if (!content) {
      throw new Error('缺少参数：content')
    }

    const result = await service.addNews(params)

    ctx.body = result
  }
  async editNews(ctx, next) {
    const params = ctx.request.body

    const { id, title, content } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (!title?.trim()) {
      throw new Error('缺少参数：title')
    }
    if (!content?.trim()) {
      throw new Error('缺少参数：content')
    }

    const result = await service.editNews(params)

    ctx.body = result
  }
  async deleteNews(ctx, next) {
    const params = ctx.request.body

    const { id } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }

    const result = await service.deleteNews(params)

    ctx.body = result
  }
  async showNews(ctx, next) {
    const params = ctx.request.body

    const { id, value } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (value === undefined) {
      throw new Error('缺少参数：value')
    }

    const result = await service.showNews(params)

    ctx.body = result
  }
  async pinNews(ctx, next) {
    const params = ctx.request.body

    const { id, value } = params
    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (value === undefined) {
      throw new Error('缺少参数：value')
    }

    const result = await service.pinNews(params)

    ctx.body = result
  }
}

module.exports = new WechatController()