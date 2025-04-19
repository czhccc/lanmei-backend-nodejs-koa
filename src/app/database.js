const mysql = require('mysql2')

const config = require('./config')

const connections = mysql.createPool({ // 连接池
  host: config.MYSQL_HOST,
  port: config.MYSQL_PORT,
  database: config.MYSQL_DATABASE,
  user: config.MYSQL_USER,
  password: config.MYSQL_PASSWORD
})

connections.getConnection((error, connection) => {
  const logger = require('../utils/logger')
  if (error) {
    logger.error('mysql', 'mysql连接池 连接失败', { error });
  } else {
    // logger.info('mysql', '数据库连接池连接成功');
    connection.release(); // 记得释放测试用连接
  }
})

module.exports = connections.promise()