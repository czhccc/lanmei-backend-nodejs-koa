const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('@koa/cors');
const staticAssets = require('koa-static')
const path = require('path');

const responseHandler = require('../middlewares/global/response-handler');

const useRoutes = require('../router/index')

const app = new Koa()

// 静态资源
app.use(staticAssets(path.join(__dirname, '../../files')))

// 跨域
app.use(cors({
  origin: 'http://localhost:5173',  // 允许所有域名
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],  // 允许的 HTTP 方法
  allowHeaders: ['Content-Type', 'Authorization'],  // 允许的请求头
}))


app.use(bodyParser()) // 解析请求的JSON数据的中间件


app.use(responseHandler);
useRoutes(app) // 加载路由


module.exports = app