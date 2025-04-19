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
  constructor(key = 'unknown key', message = null) {
    super({ code: 'INVALID_PARAMETER', message, status: 400, details: `无效的参数值: ${key}` })
  }
}

class InvalidTokenError extends BaseError {
  constructor(message = '身份过期，请重新登录', details = 'Token 无效') {
    super({ code: 'INVALID_TOKEN', message, status: 401, details })
  }
}

class DuplicateSubmitError extends BaseError {
  constructor(message = '请勿重复提交', details = null) {
    super({ code: 'DUPLICATE_SUBMIT', message, status: 429, details })
  }
}

class ResourceNotFoundError extends BaseError {
  constructor(message = '资源未找到', details = null) {
    super({ code: 'NOT_FOUND', message, status: 404, details })
  }
}

class InvalidLogicError extends BaseError {
  constructor(message = '', details = null) {
    super({ code: 'INVALID_LOGIC', message: `不符合业务流程逻辑: ${message}`, status: 422, details })
  }
}

class CalculationError extends BaseError {
  constructor(message = '', details = null) {
    super({ code: 'CALCULATION_ERROR', message: `计算异常: ${message}`, status: 500, details })
  }
}

class InternalError extends BaseError {
  constructor(message = '', details = null) {
    super({ code: 'INTERNAL_ERROR', message: `服务器内部错误: ${message}`, status: 500, details })
  }
}

class IllegalCall extends BaseError {
  constructor(message = '当前操作不被允许', details = null) {
    super({ code: 'Illegal_Call', message, status: 500, details })
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
  InternalError,
  IllegalCall,
}
