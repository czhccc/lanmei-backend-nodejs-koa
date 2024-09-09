const Koa = require('koa')
const bodyParser = require('koa-bodyparser')

const errorHandler = require('./error-handle')

const useRoutes = require('../router/index')

const app = new Koa()

app.use(bodyParser()) // 解析请求的JSON数据的中间件

useRoutes(app) // 加载路由


app.on('error', errorHandler)

module.exports = app