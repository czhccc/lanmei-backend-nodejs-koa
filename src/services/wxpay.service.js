const connection = require('../app/database')

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs');

const logger = require('../utils/logger');

const customError = require('../utils/customError');

const { WX_CONFIG } = require('../app/config')

const axios = require('axios')

const crypto = require('crypto');

const path = require('path');
const fs = require('fs');

// 加载商户私钥
let privateKey;
try {
  privateKey = fs.readFileSync(path.join(__dirname, '../app/wxpay/apiclient_key.pem'));
} catch (error) {
  throw new customError.InvalidLogicError('微信支付商户私钥加载失败');
}

class WxpayService {
  async getWxpayParams(params) {

    // ============ 官方文档 ============
    // https://pay.weixin.qq.com/doc/v3/merchant/4012791897

    const { code, orderNo } = params

    try {
      // ============ 获取 openid ============
      let getOpenidUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_CONFIG.appid}&secret=${WX_CONFIG.appsecret}&js_code=${code}&grant_type=authorization_code`;

      const openidResponse = await axios.get(getOpenidUrl, {
        timeout: 5000 // 5秒超时
      })
      if (!openidResponse.data || !openidResponse.data.openid) {
        throw new customError.InvalidLogicError('微信支付请求获取openid失败');
      }
      const openid = openidResponse.data.openid;

      // ============ 生成 包体参数 ============
      let bodyParams = {
        appid: WX_CONFIG.appid, // 小程序appid
        mchid: WX_CONFIG.mchId, // 商户号
        description: '土土美食小程序下单', // 商品描述
        out_trade_no: orderNo, // 商户系统内部订单号，要求6-32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
        notify_url: 'https://www.weixin.qq.com/wxpay/pay.php', // 回调地址，商户接收支付成功回调通知的地址，需按照notify_url填写注意事项规范填写。
        amount: {
          // total: 1 * 100, // 订单总金额，单位为分
          total: 1, // 订单总金额，单位为分
        },
        payer: {
          openid
        }
      }

      // ============ 生成 HTTP头参数 ============
      // 1. 准备签名所需参数
      const timestamp = Math.floor(Date.now() / 1000).toString(); // 时间戳（秒级）
      const nonceStr = crypto.randomBytes(16).toString('hex'); // 32位随机字符串
      const serialNo = WX_CONFIG.serialNo; // 商户API证书序列号（从微信商户平台获取）
      const merchantId = WX_CONFIG.mchId; // 商户号
      
      // 2. 构造待签名字符串（微信V3规范）
      // const signString = ['POST', '/v3/pay/transactions/jsapi', timestamp, nonceStr, JSON.stringify(bodyParams), ''].join('\n');
      const signString = `POST\n/v3/pay/transactions/jsapi\n${timestamp}\n${nonceStr}\n${JSON.stringify(bodyParams)}\n`;
      
      // 3. 使用商户私钥进行签名
      const signer = crypto.createSign('RSA-SHA256');
      signer.update(signString);
      const signature = signer.sign(privateKey, 'base64');
      
      // 4. 构建 Authorization 头部
      const signData = `WECHATPAY2-SHA256-RSA2048 mchid="${merchantId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`;


      // ============ 发起支付请求 ============
      const wxpayResponse = await axios.post('https://api.mch.weixin.qq.com/v3/pay/transactions/jsapi', bodyParams, {
        headers: {
          'Authorization': signData,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      })
      if (wxpayResponse.status !== 200 || !wxpayResponse.data.prepay_id) {
        throw new customError.InvalidLogicError('微信支付请求获取prepayId失败');
      }
      const prepayId = wxpayResponse.data.prepay_id;


      // ============ 小程序调起支付 ============
      // 生成新的随机字符串和时间戳
      const payNonceStr = crypto.randomBytes(16).toString('hex');
      const payTimestamp = Math.floor(Date.now() / 1000).toString();
      
      // 构造前端支付签名串
      // const paySignString = [WX_CONFIG.appid, payTimestamp, payNonceStr, `prepay_id=${prepayId}`].join('\n');
      const paySignString = `${WX_CONFIG.appid}\n${payTimestamp}\n${payNonceStr}\nprepay_id=${prepayId}\n`;
      
      // 使用私钥签名
      const paySigner = crypto.createSign('RSA-SHA256');
      paySigner.update(paySignString);
      const paySign = paySigner.sign({
        key: privateKey,
        format: 'pem'
      }, 'base64');
      
      // ============ 将参数返回给小程序 ============
      return {
        timeStamp: payTimestamp,
        nonceStr: payNonceStr,
        package: `prepay_id=${prepayId}`,
        signType: 'RSA',
        paySign: paySign
      };

    } catch (error) {
      console.log(error);
      logger.error('service', 'service error: getWxpayParams', { error })
      throw error;
    }
  }
  async wxpaySuccessCallback(params) {
    // 微信支付成功，微信服务器调用该接口传递参数过来
  }
}

module.exports = new WxpayService()