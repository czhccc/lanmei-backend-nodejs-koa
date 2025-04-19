// logger.js
const pino = require('pino');

const util = require('util');

const connection = require('../app/database');

// === 配置项 ===
const ENABLE_DB_LOGGING = true;
const SAVE_LEVELS = ['error', 'warn', 'info'];
const VALID_LOG_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace']);

// 日志级别映射
const levelMap = {
  60: 'FATAL', // pino级别数值映射
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE'
};

// === 自定义日志传输 ===
const customTransport = {
  write: (chunk) => {
    try {
      const log = JSON.parse(chunk);

      const timestamp = new Date(log.time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      const output = util.format(
        '[%s] %s %s - %s',
        timestamp,
        levelMap[log.level].padEnd(5),
        log.module ? `<${log.module}>` : '<unknownModule>',
        log.msg
      );

      const stream = log.level >= 50 ? process.stderr : process.stdout;
      stream.write(output + '\n');

      // 如果有 detail，打印
      if (log.detail && Object.keys(log.detail).length > 0) {
        stream.write('  ↪ Detail:\n');

        // 检查是否是 Error 栈结构
        if (log.detail.error && Array.isArray(log.detail.error.stack)) {
          const { message, stack } = log.detail.error;

          for (const line of stack) {
            stream.write('          ' + line + '\n');
          }
        } else {
          const detailStr = JSON.stringify(log.detail, null, 2)
            .split('\n')
            .map(line => '            ' + line)
            .join('\n');
          stream.write(detailStr + '\n');
        }
      }
    } catch (err) {
      console.error('日志格式化失败:', err);
    }
  }
};


// === 初始化pino实例 ===
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime
}, customTransport);

// === 数据库日志写入 ===
async function logToDB(level, moduleType, message, detail) {
  if (!ENABLE_DB_LOGGING || !SAVE_LEVELS.includes(level)) return;

  try {
    const detailStr = detail ? JSON.stringify(detail) : null;

    await connection.query(
      `INSERT INTO system_logs (level, moduleType, message, detail, timestamp) VALUES (?,?,?,?,?)`,
      [level.toUpperCase(), moduleType, message, detailStr, new Date()]
    );
  } catch (err) {
    process.stderr.write(`[Logger] 数据库写入失败: ${err.message}\n`);
  }
}

// === 日志方法包装 ===
const logger = {};
for (const level of VALID_LOG_LEVELS) {
  logger[level] = (module, message, detail) => {
    let structuredDetail = detail;

    // 如果传入的是 Error 实例，结构化处理
    if (detail?.error && (detail.error instanceof Error)) {
      structuredDetail = {
        ...structuredDetail,
        error: {
          message: detail.error.message,
          stack: detail.error.stack.split('\n') // 拆成数组方便换行显示
        }
      };
    }

    // 构造日志对象
    const pinoLogObj = {
      module,
      msg: message,
      detail: structuredDetail
    };

    // 调用pino核心记录方法
    if (baseLogger[level]) {
      baseLogger[level](pinoLogObj);
    } else {
      process.stderr.write(`[Logger] 无效日志级别: ${level}\n`);
    }

    // 异步写入数据库
    if (SAVE_LEVELS.includes(level)) {
      logToDB(level, module, message, structuredDetail)
        .catch(err => process.stderr.write(`[Logger] 异步写入失败: ${err.message}\n`));
    }
  };
}


// === 关闭方法 ===
logger.shutdown = async () => {
  if (ENABLE_DB_LOGGING) {
    try {
      await connections.end();
      process.stdout.write('[Logger] 数据库连接池已关闭\n');
    } catch (err) {
      process.stderr.write(`[Logger] 关闭连接池失败: ${err.message}\n`);
    }
  }
};

module.exports = logger;