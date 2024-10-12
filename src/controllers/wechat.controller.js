const service = require('../services/wechat.service')

const axios = require('axios');

const jwt = require('jsonwebtoken')
const {
  TOKEN_PRIVATE_KEY,
  TOKEN_DURATION
} = require('../app/config')

class WechatController {
  static accessTokenCache = {
    accessToken: null,
    expireTime: null,
  }

  async getPhoneNumber(ctx, next) {
    const params = ctx.request.body

    const { code, encryptedData, iv } = params;

    // 微信的 appId 和 appSecret
    const appId = 'wx742023d15a0c05ed';
    const appSecret = 'd999393e4cf30baa5f0ac9378a3ab6f0';
    const getAccessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;

    try {
      const currentTime = new Date().getTime();
      if (WechatController.accessTokenCache.accessToken && WechatController.accessTokenCache.expireTime > currentTime) { // 有token

      } else { // token失效
        const getAccessTokenResult = await axios.get(getAccessTokenUrl);
        // console.log('getAccessTokenResult.data', getAccessTokenResult.data)
        WechatController.accessTokenCache = {
          accessToken: getAccessTokenResult.data.access_token,
          expireTime: currentTime + getAccessTokenResult.data.expires_in*1000,
        }
      }
      
      const getPhoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${WechatController.accessTokenCache.accessToken}`
      let getPhoneResult = await axios.post(getPhoneUrl, { code })
      // console.log('getPhoneResult.data', getPhoneResult.data);
      const phone = getPhoneResult.data.phone_info.phoneNumber

      const token = jwt.sign(
        {
          phone: phone,
        }, 
        TOKEN_PRIVATE_KEY,
        {
          expiresIn: TOKEN_DURATION,
          algorithm: 'RS256',
        }
      )

      ctx.body = {
        phone,
        token
      }
    } catch (err) {
      throw new Error('手机号解密失败')
    }

  }

  // 用户收货地址
  async getAddressList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getAddressList(params)
    ctx.body = result
  }
  async addAddress(ctx, next) {
    const params = ctx.request.body
    const result = await service.addAddress(params)
    ctx.body = result
  }
  async editAddress(ctx, next) {
    const params = ctx.request.body
    const result = await service.editAddress(params)
    ctx.body = result
  }
  async deleteAddress(ctx, next) {
    const params = ctx.request.body
    const result = await service.deleteAddress(params)
    ctx.body = result
  }

  // 用户首页通知
  async getNotificationList(ctx, next) {
    const params = ctx.request.query
    const result = await service.getNotificationList(params)
    ctx.body = result
  }
  async notify(ctx, next) {
    let params = ctx.request.body
    params.thePhone = ctx.theUser.phone
    const result = await service.notify(params)
    ctx.body = result
  }
  async getLatestNotification(ctx, next) {
    let params = ctx.request.query
    const result = await service.getLatestNotification(params)
    ctx.body = result
  }
}

module.exports = new WechatController()