const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()


// ================================ 基本 ================================
const DOMAIN_NAME = ''
const APP_PORT = 8888
const BASE_URL = 'http://localhost:8888'
const DEFAULT_PASSWORD = '123456+'


// ================================ token ================================
const TOKEN_PRIVATE_KEY = fs.readFileSync(path.resolve(__dirname, './token-keys/private.pem'))
const TOKEN_PUBLIC_KEY = fs.readFileSync(path.resolve(__dirname, './token-keys/public.pem'))
const TOKEN_DURATION = 1000 * 60 * 60 * 24 * 7


// ================================ mysql数据库 ================================
const MYSQL_HOST = 'localhost'
const MYSQL_PORT = 3306
const MYSQL_DATABASE = 'lanmei'
const MYSQL_USER = 'root'
const MYSQL_PASSWORD = '123456'


// ================================ redis ================================
const REDIS_HOST = '127.0.0.1'
const REDIS_PORT = 6379
const REDIS_PASSWORD = ''
const REDIS_DB = 0
const REDIS_MAX_RETRIES = 3
const REDIS_TIMEOUT = 5000

// ================================ 腾讯云存储COS ================================
const COS_TemporaryKey_TTL = 60 * 60 * 2 // 临时密钥有效时间，单位为秒

// ================================ 微信支付 ================================
const WX_PAY_CONFIG = {
  sandbox: true, // 是否沙箱环境
  appId: "wx1234567890abcdef", // 测试公众号APPID（需自行注册测试号）
  mchId: "1900000000", // 沙箱商户号（固定值）
  apiKey: "YourSandboxAPIKey", // 沙箱API密钥（需通过微信工具生成，见下文说明）
  notifyUrl: "http://your-ngrok-domain.com/pay/notify", // 回调地址（需外网可达，可用内网穿透工具）
  sandboxApiUrl: "https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder", // 沙箱统一下单接口
};


// ================================ czh admio phone ================================
const czhAdminPhone = '19967303498'

// ================================ 导出 ================================
module.exports = {
  DOMAIN_NAME,
  APP_PORT,
  BASE_URL,
  DEFAULT_PASSWORD,

  TOKEN_PRIVATE_KEY,
  TOKEN_PUBLIC_KEY,
  TOKEN_DURATION,

  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD,

  REDIS_HOST,
  REDIS_PORT,
  REDIS_PASSWORD,
  REDIS_DB,
  REDIS_MAX_RETRIES,
  REDIS_TIMEOUT,

  COS_TemporaryKey_TTL,

  WX_PAY_CONFIG,

  czhAdminPhone,
}