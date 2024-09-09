const errorTypes = require('../constants/error-types')

const errorHandler = (error, ctx) => {
  console.log(error.message)

  let status = 400
  let message = error.message;

  switch (error.message) {
    case errorTypes.NECESSARY_PARAM_IS_NULL:
      break;
    case errorTypes.UNIQUE_FIELD_DUPLICATE:
      break;
    case errorTypes.ADMIN_NOT_EXIST: // admin不存在
      break;
    case errorTypes.ADMIN_PASSWORD_WRONG: // 密码错误
      break;
    case errorTypes.UNAUTHORIZED: // 密码错误
      status = 401
      break;
    
    default:
      status = 404
      message = '未知错误'
      break;
  }

  ctx.status = status
  ctx.body = message
}

module.exports = errorHandler