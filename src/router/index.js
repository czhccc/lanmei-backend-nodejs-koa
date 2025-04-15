const fs = require('fs');
const Router = require('koa-router');

const useRoutes = app => {
  // 定义公共前缀
  const prefix = '/api';

  // 自动装配所有路由
  fs.readdirSync(__dirname).forEach(file => {
    if (file === 'index.js') return;

    // 加载每个路由文件
    const router = require(`./${file}`);

    // 使用 Koa Router 的 prefix 给每个路由添加前缀
    const prefixedRouter = new Router({ prefix });

    // 将原有的路由添加到带前缀的 Router 中
    router.stack.forEach(route => {
      route.methods.forEach(method => {
        prefixedRouter[method.toLowerCase()](route.path, ...route.stack)
      })
    });

    // 注册带前缀的路由
    app.use(prefixedRouter.routes());
    app.use(prefixedRouter.allowedMethods());
  });
};

module.exports = useRoutes