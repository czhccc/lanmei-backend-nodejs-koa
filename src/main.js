const app = require('./app')
const config = require('./app/config')

const connection = require('./app/database')

app.listen(config.APP_PORT, () => {
  console.log('蓝莓接口启动成功，端口号：8888')
})