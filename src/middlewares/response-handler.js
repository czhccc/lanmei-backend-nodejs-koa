const logger = require('../utils/logger');

const customError = require('../utils/customError');

module.exports = async (ctx, next) => {
  try {
    await next();

    if (ctx.body) {
      if (typeof ctx.body === 'string') {
        ctx.body = {
          code: 200,
          message: ctx.body
        }
      } else {
        ctx.body = {
          code: 200,
          data: ctx.body,
          message: '操作成功'
        }
      }
    } else {
      
    }
  } catch (error) {
    logger.error('response-handler', 'response-handler 捕获错误', { error })

    if (error instanceof customError.BaseError) {
      ctx.status = error.status
      ctx.body = {
        code: error.code,
        message: error.message,
        details: error.details || null
      }
    } else {
      // 非预期错误
      ctx.status = 500
      ctx.body = {
        code: 'INTERNAL_ERROR',
        message: '存在未知错误'
      }
    }
  }
};
