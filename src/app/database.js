const mysql = require('mysql2')

const config = require('./config')

const logger = require('../utils/logger')

const connections = mysql.createPool({ // 连接池
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  database: config.MYSQL_DATABASE,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD
})

connections.getConnection((error, connection) => {
  connection.connect(error => {
    if (error) {
      logger.error('mysql连接池 连接失败', { error })
    } else {
      // console.log('数据库连接池 连接成功~')
    }
  })
})

module.exports = connections.promise()