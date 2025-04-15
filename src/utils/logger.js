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
 * 增强版安全序列化函数
 * 处理：循环引用、Error对象、BigInt类型
 */
const safeStringify = (() => {
  const replacer = (key, value) => {
    const seen = new WeakSet();
    
    const customReplacer = (k, v) => {
      // 处理循环引用
      if (typeof v === 'object' && v !== null) {
        if (seen.has(v)) return '[Circular]';
        seen.add(v);
      }
      
      // 处理特殊类型
      if (v instanceof Error) {
        return {
          __type: 'Error',
          message: v.message,
          stack: v.stack,
          name: v.name
        };
      }
      if (typeof v === 'bigint') {
        return { __type: 'bigint', value: v.toString() };
      }
      return v;
    };
    
    return customReplacer(key, value);
  };

  return (obj, space = 2) => {
    try {
      return JSON.stringify(obj, replacer, space)
        .replace(/"__type":"(Error|bigint)"/g, '"$1"');
    } catch (error) {
      return `{ metaStringifyError: ${error.message} }`;
    }
  };
})();

/**
 * 创建MySQL Transport并添加故障转移机制
 */
const createMySQLTransport = () => {
  try {
    const transport = new MySQLTransport({
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
        format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
      )
    });

    // 智能健康检查
    let checkInterval = 300000; // 初始5分钟
    let healthCheckTimer;
    let consecutiveSuccess = 0;

    const performCheck = () => {
      transport.db.ping(error => {
        console.log('transport.db.ping');
        if (error) {
          console.error('DB健康检查失败:', error.message);
          consecutiveSuccess = 0;
          checkInterval = 60000; // 失败时1分钟检查
        } else {
          consecutiveSuccess++;
          if (consecutiveSuccess > 3) {
            checkInterval = 1800000; // 成功时30分钟检查
          }
        }
        
        clearInterval(healthCheckTimer);
        healthCheckTimer = setInterval(performCheck, checkInterval);
      });
    };

    transport.on('connected', () => {
      performCheck();
    });

    transport.on('close', () => {
      clearInterval(healthCheckTimer);
    });

    return transport;
  } catch (error) {
    console.error('MySQL Transport初始化失败:', error);
    return null;
  }
};

// 基础格式配置
const baseFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  // 敏感信息过滤
  format((info) => {
    const { password, apiKey, token, ...cleanMeta } = info.metadata;
    return { ...info, metadata: cleanMeta };
  })(),
  // 安全序列化
  format((info) => {
    info.meta = safeStringify(info.metadata);
    return info;
  })()
);

// 控制台格式
const consoleFormat = format.combine(
  baseFormat,
  format.colorize(),
  format.printf(({ timestamp, level, message, meta }) => {
    // return `[${timestamp}] ${level}: ${message} ${meta || ''}`;
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// 初始化传输器
const transports = [
  new winston.transports.Console({ format: consoleFormat })
];

// MySQL传输器（开发环境）
const mysqlTransport = createMySQLTransport();
if (mysqlTransport) {
  // 错误降级处理
  mysqlTransport.on('error', (error) => {
    console.error('MySQL日志故障，降级到文件:', error.message);
    
    const fallbackTransport = new winston.transports.File({
      filename: path.join(logDir, 'fallback.log'),
      format: format.combine(baseFormat, format.json())
    });
    
    logger.add(fallbackTransport);
    logger.remove(mysqlTransport);
    
    // 发送报警（示例）
    // sendAlertToSentry(`MySQL日志故障: ${error.message}`);
  });
  
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
    format: format.combine(baseFormat, format.json())
  }));
}

// 创建Logger实例
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  handleRejections: true,
  exitOnError: false,
  format: baseFormat,
  transports
});

// 全局错误处理
logger.transports.forEach(transport => {
  transport.on('error', (error) => {
    console.error('日志传输错误:', error.message);
    // 发送报警（示例）
    // sendAlertToSentry(`日志传输错误: ${error.message}`);
  });
});

module.exports = logger;