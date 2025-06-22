// const Koa = require('koa')
// const bodyParser = require('koa-bodyparser')
// const cors = require('@koa/cors');
// const staticAssets = require('koa-static')
// const path = require('path');

// const responseHandler = require('../middlewares/response-handler');

// const useRoutes = require('../router/index')

// const app = new Koa()

// const range = require('koa-range');

// require('./scheduledTasks'); // 引入定时任务

// // 静态资源
// app.use(staticAssets(path.join(__dirname, '../../files')))

// // 跨域
// app.use(cors({
//   // origin: 'http://localhost:5173',  // 允许所有域名
//   origin: '*',  // 允许所有域名
//   allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],  // 允许的 HTTP 方法
//   allowHeaders: ['Content-Type', 'Authorization'],  // 允许的请求头
// }))


// app.use(bodyParser()) // 解析请求的JSON数据的中间件


// app.use(responseHandler);

// app.use(range);

// useRoutes(app) // 加载路由


// module.exports = app

const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('@koa/cors');
const staticAssets = require('koa-static')
const path = require('path');
const axios = require('axios'); // 新增 axios
const range = require('koa-range');
const responseHandler = require('../middlewares/response-handler');
const useRoutes = require('../router/index')

const app = new Koa()

// 静态资源
app.use(staticAssets(path.join(__dirname, '../../files')))

// 跨域
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use(bodyParser())

// 新增：图片代理中间件（放在路由之前）
app.use(async (ctx, next) => {
  // 仅处理特定路径的请求
  if (ctx.path === '/api/handleCOSUrl') {
    const { url } = ctx.query;
    
    if (!url) {
      ctx.status = 400;
      ctx.body = { error: '缺少 URL 参数' };
      return;
    }
    
    try {
      const imageUrl = decodeURIComponent(url);
      console.log('代理图片:', imageUrl);
      
      const response = await axios({
        method: 'get',
        url: imageUrl,
        responseType: 'stream',
        headers: {
          Range: ctx.headers.range || ''
        }
      });
      
      // 移除问题响应头
      ctx.set({
        ...response.headers,
        'content-disposition': undefined,
        'x-cos-force-download': undefined,
        'Cache-Control': 'public, max-age=31536000'
      });
      
      ctx.status = response.status;
      ctx.body = response.data;
      
      // 处理流错误
      response.data.on('error', err => {
        console.error('图片流错误:', err);
        if (!ctx.headerSent) {
          ctx.status = 500;
          ctx.body = '图片流传输失败';
        }
      });
      
    } catch (error) {
      console.error('代理错误:', error);
      ctx.status = error.response?.status || 500;
      ctx.body = `图片代理失败: ${error.message}`;
    }
    
    return; // 直接返回，不继续后续中间件
  }
  
  // 非代理请求继续后续中间件
  await next();
});

app.use(responseHandler);
app.use(range);
useRoutes(app); // 加载路由

module.exports = app;