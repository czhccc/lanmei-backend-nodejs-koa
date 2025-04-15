const redisUtils = require("./redisUtils");

const crypto = require("crypto");

const logger = require("./logger");

/**
 * 生成幂等性 Key
 * @param {object} params - 用于生成key的参数，必须是对象
 * @param {string} [prefix=''] - 可选前缀，用于区分不同业务场景
 * @returns {string} - 幂等性 key（64 字符）
 */
const generateIdempotencyKey = (params, prefix='') => {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw new Error('参数必须是一个非空对象');
  }
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('前缀必须是一个字符串');
  }

  // 保证字段顺序一致性：按 key 排序
  const orderedParams = {
    prefix,
  };
  Object.keys(params).sort().forEach(key => {
    orderedParams[key] = params[key];
  });

  const serialized = JSON.stringify(orderedParams);
  const hash = crypto.createHash('sha256').update(serialized).digest('hex');

  return `idempotency:${prefix}:${hash}`;
};

const setIdempotencyKey = async (key) => {
  if (!key) {
    logger.error('utils/idempotency setIdempotencyKey 缺少参数: key');
    throw new Error('缺少参数: key');
  }

  try {
    // 设置过期时间为 5秒
    const result = await redisUtils.setSimply(key, null, 5);   

    return result
  } catch (error) {
    logger.error('utils/idempotency setIdempotencyKey error', { error })
    throw error
  }
}

const idempotencyKeyExists = async (key) => {
  if (!key) {
    logger.error('utils/idempotency idempotencyKeyExists 缺少参数: key');
    throw new Error('缺少参数: key');
  }

  try {
    const result = await redisUtils.keyExists(key);   

    return result
  } catch (error) {
    logger.error('service error: setIdempotencyKey', { error })
    throw error
  }
}

const delIdempotencyKey = async (key) => {
  if (!key) {
    logger.error('utils/idempotency delIdempotencyKey 缺少参数: key');
    throw new Error('缺少参数: key');
  }

  try {
    const result = await redisUtils.delSimply(key);   

    return result
  } catch (error) {
    logger.error('service error: setIdempotencyKey', { error })
    throw error
  }
}


module.exports = {
  generateIdempotencyKey,
  setIdempotencyKey,
  delIdempotencyKey,
  idempotencyKeyExists
};