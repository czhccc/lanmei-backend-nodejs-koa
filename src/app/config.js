const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()


// ================================ 基本 ================================
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


// ================================ 微信支付 ================================
const WX_PAY_CONFIG = {
  sandbox: true, // 是否沙箱环境
  appId: "wx1234567890abcdef", // 测试公众号APPID（需自行注册测试号）
  mchId: "1900000000", // 沙箱商户号（固定值）
  apiKey: "YourSandboxAPIKey", // 沙箱API密钥（需通过微信工具生成，见下文说明）
  notifyUrl: "http://your-ngrok-domain.com/pay/notify", // 回调地址（需外网可达，可用内网穿透工具）
  sandboxApiUrl: "https://api.mch.weixin.qq.com/sandboxnew/pay/unifiedorder", // 沙箱统一下单接口
};


// ================================ 导出 ================================
module.exports.APP_PORT = APP_PORT
module.exports.BASE_URL = BASE_URL
module.exports.DEFAULT_PASSWORD = DEFAULT_PASSWORD

module.exports.TOKEN_PRIVATE_KEY = TOKEN_PRIVATE_KEY
module.exports.TOKEN_PUBLIC_KEY = TOKEN_PUBLIC_KEY
module.exports.TOKEN_DURATION = TOKEN_DURATION

module.exports.MYSQL_HOST = MYSQL_HOST
module.exports.MYSQL_PORT = MYSQL_PORT
module.exports.MYSQL_DATABASE = MYSQL_DATABASE
module.exports.MYSQL_USER = MYSQL_USER
module.exports.MYSQL_PASSWORD = MYSQL_PASSWORD

module.exports.REDIS_HOST = REDIS_HOST
module.exports.REDIS_PORT = REDIS_PORT
module.exports.REDIS_PASSWORD = REDIS_PASSWORD
module.exports.REDIS_DB = REDIS_DB
module.exports.REDIS_MAX_RETRIES = REDIS_MAX_RETRIES
module.exports.REDIS_TIMEOUT = REDIS_TIMEOUT

module.exports.WX_PAY_CONFIG = WX_PAY_CONFIG