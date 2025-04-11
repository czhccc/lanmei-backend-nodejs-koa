const winston = require('winston');
const { format } = winston;
const MySQLTransport = require('winston-mysql');
const config = require('../app/config'); // 假设您的配置模块

/**
 * 自定义安全字符串化函数，防止循环引用报错
 * @param {object} meta 元数据
 */
const safeStringify = (meta) => {
  try {
    return JSON.stringify(meta, (key, value) => {
      return value instanceof Error ? { message: value.message, stack: value.stack } : value;
    });
  } catch (err) {
    return `{ metaStringifyError: ${err.message} }`;
  }
};

/**
 * 创建带故障转移机制的 MySQL Transport
 * 当 MySQL 不可用时自动降级到文件存储
 */
const createMySQLTransport = () => {
  try {
    return new MySQLTransport({
      host: config.MYSQL_HOST,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      table: 'system_logs', // 日志表名
      fields: {            // 表字段映射
        level: 'level',
        message: 'message',
        timestamp: 'timestamp',
        meta: 'meta'       // 建议使用 JSON 类型字段
      },
      // 异步写入模式 (重要！避免阻塞事件循环)
      queueLimit: 100,     // 队列最大条目数
      handleExceptions: true,
      // 字段格式化
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        format((info) => {
          info.meta = safeStringify(info.metadata);
          return info;
        })()
      )
    });
  } catch (err) {
    console.error('MySQL 传输器初始化失败，降级到文件存储:', err);
  }
};

// 创建 Logger 实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // 异常处理挂钩
  handleRejections: true,  // 处理未捕获的 Promise 异常
  exitOnError: false,      // 日志失败不终止进程
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // 记录错误堆栈
    format.splat(),
    format.json()
  ),
  transports: [
    // 控制台输出（开发环境友好格式）
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, meta }) => {
          return `[${timestamp}] ${level}: ${message} ${
            meta ? safeStringify(meta) : ''
          }`;
        })
      )
    }),
    // 主存储：MySQL
    createMySQLTransport(),
    // 文件备份（生产环境推荐）
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

// 监听传输错误事件（重要！）
logger.transports.forEach(transport => {
  transport.on('error', (err) => {
    console.error('Logger transport error:', err);
    // 可触发报警通知（例如发送到 Sentry）
  });
});

module.exports = logger;