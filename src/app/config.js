const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

dotenv.config()

const BASE_URL = 'http://localhost:8888'

const TOKEN_PRIVATE_KEY = fs.readFileSync(path.resolve(__dirname, './token-keys/private.pem'))
const TOKEN_PUBLIC_KEY = fs.readFileSync(path.resolve(__dirname, './token-keys/public.pem'))
const TOKEN_DURATION = 1000 * 60 * 60 * 24

module.exports = {
  APP_PORT,
  MYSQL_HOST,
  MYSQL_PORT,
  MYSQL_DATABASE,
  MYSQL_USER,
  MYSQL_PASSWORD,
} = process.env


module.exports.BASE_URL = BASE_URL
module.exports.TOKEN_PRIVATE_KEY = TOKEN_PRIVATE_KEY
module.exports.TOKEN_PUBLIC_KEY = TOKEN_PUBLIC_KEY
module.exports.TOKEN_DURATION = TOKEN_DURATION
module.exports.DEFAULT_PASSWORD = '123456+'