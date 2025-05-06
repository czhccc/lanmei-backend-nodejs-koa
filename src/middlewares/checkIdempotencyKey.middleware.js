const {
  getIdempotencyKeyStatus
} = require('../utils/idempotency')

const logger = require('../utils/logger');

const customError = require('../utils/customError')

const checkIdempotencyKey = async (ctx, next) => {

  const { idempotencyKey } = ctx.request.body
  
  if (!idempotencyKey) {
    throw new customError.MissingParameterError('idempotencyKey')
  }

  try {
    const idempotencyResult = await getIdempotencyKeyStatus(idempotencyKey)

    // if (!idempotencyResult || idempotencyResult==='fail') {
    if (!idempotencyResult) {
      ctx.request.body.idempotencyKey = idempotencyKey
      await next()
    } else {
      if (idempotencyResult.startsWith("idempotency-succeeded:")) {
        ctx.body = {
          idempotencyResult
        }
        return;
      } else {
        throw new customError.DuplicateSubmitError('请勿重复提交')
      }
    }
  } catch (error) {
    logger.error('idempotency', 'middleware checkIdempotencyKey checkIdempotencyKey error', { error })
    throw error
  }
}

module.exports = checkIdempotencyKey