// Base 错误类
class BaseError extends Error {
  constructor({ code = 'UNKNOWN_ERROR', message = '未知错误', status = 500, details }) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.status = status
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

// 各类子错误
class MissingParameterError extends BaseError {
  constructor(key = '', details = null) {
    super({ code: 'MISSING_PARAMETER', message: `缺少必要参数: ${key}`, status: 400, details })
  }
}

class InvalidParameterError extends BaseError {
  constructor(key = 'unknown key', details = null) {
    super({ code: 'INVALID_PARAMETER', message: `无效的参数值: ${key}`, status: 400, details })
  }
}

class InvalidTokenError extends BaseError {
  constructor(details = null) {
    super({ code: 'INVALID_TOKEN', message: `身份过期，请重新登录`, status: 401, details })
  }
}

class DuplicateSubmitError extends BaseError {
  constructor(details = null) {
    super({ code: 'DUPLICATE_SUBMIT', message: `请勿重复提交`, status: 429, details })
  }
}

class ResourceNotFoundError extends BaseError {
  constructor(details = null) {
    super({ code: 'NOT_FOUND', message: `资源未找到`, status: 404, details })
  }
}

class InvalidLogicError extends BaseError {
  constructor(details = null) {
    super({ code: 'INVALID_LOGIC', message: `业务流程逻辑出现错误`, status: 422, details })
  }
}

class CalculationError extends BaseError {
  constructor(details = null) {
    super({ code: 'CALCULATION_ERROR', message: `计算异常`, status: 500, details })
  }
}

class InternalError extends BaseError {
  constructor(details = null) {
    super({ code: 'INTERNAL_ERROR', message: `服务器内部错误`, status: 500, details })
  }
}

class IllegalCallError extends BaseError {
  constructor(details = null) {
    super({ code: 'ILLEGAL_CALL', message: `无权进行此操作`, status: 500, details })
  }
}

class RedisVersionConflictError extends BaseError {
  constructor(details = null) {
    super({ code: 'Redis_Version_Conflict', message: `Redis版本号冲突`, status: 500, details })
  }
}

class RedisUnavailableError extends BaseError {
  constructor(details = null) {
    super({ code: 'REDIS_UNAVAILABLE', message: `Redis不可用`, status: 500, details })
  }
}

// 判断是否为系统自定义错误
function isCustomError(error) {
  if (!error || typeof error !== 'object') return false

  if (error instanceof BaseError) return true

  const customErrorNames = new Set([
    'BaseError',
    'MissingParameterError',
    'InvalidParameterError',
    'InvalidTokenError',
    'DuplicateSubmitError',
    'ResourceNotFoundError',
    'InvalidLogicError',
    'CalculationError',
    'InternalError',
    'IllegalCallError',
    'RedisVersionConflictError',
    'RedisUnavailableError',
  ])

  if (customErrorNames.has(error.name)) {
    return true
  }

  return false
}

// 导出命名空间对象
module.exports = {
  BaseError,
  MissingParameterError,
  InvalidParameterError,
  InvalidTokenError,
  DuplicateSubmitError,
  ResourceNotFoundError,
  InvalidLogicError,
  CalculationError,
  InternalError,
  IllegalCallError,
  RedisUnavailableError,
  RedisVersionConflictError,
  isCustomError,
}
