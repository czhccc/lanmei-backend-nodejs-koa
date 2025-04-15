const {
  idempotencyKeyExists
} = require('../utils/idempotency')

const logger = require('../utils/logger');

const checkIdempotencyKey = async (ctx, next) => {

  const { idempotencyKey } = ctx.request.body
  
  if (!idempotencyKey) {
    throw new Error('缺少参数: idempotencyKey');
  }

  try {
    const result = await idempotencyKeyExists(idempotencyKey) // 设置过期时间为 1 天

    if (!result) {
      ctx.request.body.idempotencyKey = idempotencyKey
      await next()
    } else {
      logger.error('idempotencyKey 已存在，请勿重复提交')
      throw new Error('请勿重复提交')
    }
  } catch (error) {
    logger.error('middleware checkIdempotencyKey checkIdempotencyKey error', { error })
    throw error
  }
}

module.exports = checkIdempotencyKey