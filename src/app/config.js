const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()


// ================================ 基本 ================================
const DOMAIN_NAME = ''
const APP_PORT = 8800
const BASE_URL = 'http://localhost:8800'
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
const COS_secretId = '' // 临时密钥有效时间，单位为秒
const COS_secretKey = '' // 临时密钥有效时间，单位为秒
const COS_resource = '' // 临时密钥有效时间，单位为秒

// ================================ 微信支付 ================================
const WX_CONFIG = {
  appid: '', // 小程序appid
  appsecret: '', // 小程序secret
  mchId: '', // 商户号
  serialNo: '', // 商户API证书序列号（从微信商户平台获取）
};


// ================================ czh admio phone ================================
const czhAdminPhone = ''

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

  COS_secretId,
  COS_secretKey,
  COS_resource,

  WX_CONFIG,

  czhAdminPhone,
}