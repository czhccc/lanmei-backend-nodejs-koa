const fs = require('fs')

const useRoutes = app => {
  fs.readdirSync(__dirname).forEach(file => {
    if (file === 'index.js')
      return;
    const router = require(`./${file}`)
    app.use(router.routes())

    // 如果使用了未定义的请求方式（如 DELETE），allowedMethods() 会确保返回一个适当的错误响应。
    app.use(router.allowedMethods())
  })
}

module.exports = useRoutes