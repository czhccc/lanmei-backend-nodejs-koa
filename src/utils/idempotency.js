const redisUtils = require("./redisUtils");

const crypto = require("crypto");

const logger = require("./logger");

const customError = require("./customError");

/**
 * 生成幂等性 Key
 * @param {object} params - 用于生成key的参数，必须是对象
 * @param {string} [prefix=''] - 可选前缀，用于区分不同业务场景
 * @returns {string} - 幂等性 key（64 字符）
 */
const generateIdempotencyKey = (params, prefix='') => {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    throw new customError.InvalidParameterError('params', '参数必须是一个对象');
  }
  if (!prefix || typeof prefix !== 'string') {
    throw new customError.InvalidParameterError('prefix', '前缀必须是一个字符串');
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

/**
 * 尝试设置幂等性 key 为 processing 状态
 * 如果 key 已存在，则抛出错误（表示重复提交）
 */
const setIdempotencyKey = async (key) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency setIdempotencyKey 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    // 设置过期时间为 5秒
    const result = await redisUtils.setSimplyNX(key, 'processing', 5);   
    if (!result) {
      throw new customError.DuplicateSubmitError('幂等性 key 已存在，请勿重复提交');
    }
    return true
  } catch (error) {
    logger.error('idempotency', 'utils/idempotency setIdempotencyKey error', { error })
    throw error
  }
}

const idempotencyKeyExists = async (key) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency idempotencyKeyExists 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    const result = await redisUtils.keyExists(key);   

    return result
  } catch (error) {
    logger.error('idempotency', 'service error: setIdempotencyKey', { error })
    throw error
  }
}

/**
 * 获取幂等性 key 状态（无返回 null，存在则返回值）
 */
const getIdempotencyKeyStatus = async (key) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency getIdempotencyKeyStatus 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    const result = await redisUtils.getSimply(key);
    
    return result
  } catch (error) {
    logger.error('idempotency', 'getIdempotencyKeyStatus error', { error });
    throw error;
  }
};

/**
 * 设置幂等性 key 状态为成功
 * 可携带返回值（如订单ID）
 */
const markIdempotencyKeySuccess = async (key, data = '',) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency markIdempotencyKeySuccess 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    const result = await redisUtils.setSimply(key, `idempotency-succeeded:${data}`, 5);
    return result
  } catch (error) {
    logger.error('idempotency', 'markIdempotencyKeySuccess error', { error });
    throw error;
  }
};
/**
 * 标记幂等性 key 失败（可选：立即删除或设置 "fail"）
 */
const markIdempotencyKeyFail = async (key) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency markIdempotencyKeyFail 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    // 设置失败标志（可选：也可以直接不设置让它自动过期）
    const result = await redisUtils.setSimply(key, 'fail', 5);
    return result
  } catch (error) {
    logger.error('idempotency', 'markIdempotencyKeyFail error', { error });
    throw error;
  }
};

const delIdempotencyKey = async (key) => {
  if (!key) {
    logger.error('idempotency', 'utils/idempotency delIdempotencyKey 缺少参数: key');
    throw new customError.MissingParameterError('key')
  }

  try {
    const result = await redisUtils.delSimply(key);

    return result
  } catch (error) {
    logger.error('idempotency', 'delIdempotencyKey error', { error })
    throw error
  }
}


module.exports = {
  generateIdempotencyKey,
  setIdempotencyKey,
  delIdempotencyKey,
  idempotencyKeyExists,
  markIdempotencyKeySuccess,
  markIdempotencyKeyFail,
  getIdempotencyKeyStatus,
};