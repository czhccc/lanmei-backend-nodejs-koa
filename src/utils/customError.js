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
  constructor(key = '无效的参数值', details = null) {
    super({ code: 'INVALID_PARAMETER', message: `无效的参数值: ${key}`, status: 400, details })
  }
}

class InvalidTokenError extends BaseError {
  constructor(message = 'Token 无效') {
    super({ code: 'INVALID_TOKEN', message, status: 401 })
  }
}

class DuplicateSubmitError extends BaseError {
  constructor(message = '请勿重复提交') {
    super({ code: 'DUPLICATE_SUBMIT', message, status: 429 })
  }
}

class ResourceNotFoundError extends BaseError {
  constructor(message = '资源未找到') {
    super({ code: 'NOT_FOUND', message, status: 404 })
  }
}

class InvalidLogicError extends BaseError {
  constructor(message = '不符合业务流程逻辑') {
    super({ code: 'INVALID_LOGIC', message, status: 422 })
  }
}

class CalculationError extends BaseError {
  constructor(message = '计算异常') {
    super({ code: 'CALCULATION_ERROR', message: `计算异常: ${message}`, status: 500 })
  }
}

class InternalError extends BaseError {
  constructor(message = '服务器内部错误') {
    super({ code: 'INTERNAL_ERROR', message: `服务器内部错误: ${message}`, status: 500 })
  }
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
  InternalError
}
