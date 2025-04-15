const path = require('path');
const fs = require('fs');
const winston = require('winston');
const { format } = winston;
const MySQLTransport = require('winston-mysql');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../app/config');

// 创建日志目录（生产环境）
const logDir = path.join(__dirname, '../system_logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * 增强版安全序列化函数（生产环境专用）
 */
const productionStringify = (() => {
  const replacer = (key, value) => {
    const seen = new WeakSet();
    
    return (k, v) => {
      // 处理循环引用
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      
      // 简化处理特殊类型
      if (v instanceof Error) {
        return {
          message: v.message,
          stack: v.stack
        };
      }
      if (typeof v === 'bigint') {
        return v.toString();
      }
      return v;
    };
  };

  return (obj) => {
    try {
      return JSON.stringify(obj, replacer());
    } catch (error) {
      return `{ metaStringifyError: ${error.message} }`;
    }
  };
})();

/**
 * 创建MySQL Transport
 */
const createMySQLTransport = () => {
  try {
    return new MySQLTransport({
      host: config.MYSQL_HOST,
      user: config.MYSQL_USER,
      password: config.MYSQL_PASSWORD,
      database: config.MYSQL_DATABASE,
      table: 'system_logs',
      fields: {
        level: 'level',
        message: 'message',
        timestamp: 'timestamp',
        meta: 'meta'
      },
      queueLimit: 500,
      connectionTimeout: 5000,
      handleExceptions: true,
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        // 生产环境专用格式化
        format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
        format((info) => {
          info.meta = productionStringify({
            // 精选元数据字段
            error: info.metadata.error,
            stack: info.metadata.stack,
            process: {
              pid: process.pid,
              memory: process.memoryUsage().rss
            }
          });
          return info;
        })()
      )
    });
  } catch (error) {
    console.error('MySQL Transport初始化失败:', error);
    return null;
  }
};

// 基础格式配置（开发环境）
const devBaseFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  // 开发环境元数据简化
  format.metadata({
    fillWith: ['error', 'stack'],
    fillExcept: ['message', 'level', 'timestamp']
  }),
  // 敏感信息过滤
  format((info) => {
    const { password, apiKey, token, ...cleanMeta } = info.metadata;
    return { ...info, metadata: cleanMeta };
  })()
);

// 控制台格式（开发环境友好）
const consoleFormat = format.combine(
  devBaseFormat,
  format.colorize(),
  format.printf(({ timestamp, level, message, metadata }) => {
    let extras = '';
    
    if (metadata.error) {
      extras += `\n[ERROR] ${metadata.error.message}`;
      if (metadata.error.stack) {
        extras += `\n${metadata.error.stack}`;
      }
    }
    
    if (metadata.stack) {
      extras += `\n[STACK] ${metadata.stack}`;
    }

    return `[${timestamp}] ${level}: ${message}${extras}`;
  })
);

// 生产环境格式配置
const productionFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.metadata({
    fillWith: ['error', 'stack', 'process'],
    fillExcept: ['message', 'level', 'timestamp']
  }),
  format((info) => {
    // 生产环境元数据优化
    const { password, apiKey, token, ...cleanMeta } = info.metadata;
    
    // 简化进程信息
    cleanMeta.process = {
      pid: process.pid,
      memory: process.memoryUsage().rss,
      uptime: process.uptime()
    };

    // 错误对象处理
    if (cleanMeta.error instanceof Error) {
      cleanMeta.error = {
        message: cleanMeta.error.message,
        stack: cleanMeta.error.stack
      };
    }

    info.metadata = cleanMeta;
    info.meta = productionStringify(cleanMeta);
    return info;
  })()
);

// 初始化传输器
const transports = [
  new winston.transports.Console({ 
    format: process.env.NODE_ENV === 'production' ? productionFormat : consoleFormat 
  })
];

// MySQL传输器
const mysqlTransport = createMySQLTransport();
if (mysqlTransport) {
  transports.push(mysqlTransport);
}

// 生产环境文件传输
if (process.env.NODE_ENV === 'production') {
  transports.push(new DailyRotateFile({
    filename: path.join(logDir, 'systemLogs-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    auditFile: path.join(logDir, 'rotate-audit.json'),
    format: productionFormat
  }));
}

// 创建Logger实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  handleRejections: true,
  exitOnError: false,
  transports
});

// 全局错误处理
logger.transports.forEach(transport => {
  transport.on('error', (error) => {
    console.error('日志传输错误:', error.message);
  });
});

module.exports = logger;