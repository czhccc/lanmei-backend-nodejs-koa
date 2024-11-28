// response-handler.js
const errorTypes = require('../../constants/error-types');

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
      console.log('ctx.body is null');
      ctx.body = {
        code: 404,
        message: 'ctx.body is null'
      };
    }
  } catch (err) {
    console.error('response-handler 捕获错误：', err.message)

    let status = 400;
    let message = err.message || '未知错误！！！'

    switch (err.message) {
      case errorTypes.NECESSARY_PARAM_IS_NULL:
        break;
      case errorTypes.UNIQUE_FIELD_DUPLICATE:
        break;
      case errorTypes.ADMIN_NOT_EXIST:
        break;
      case errorTypes.ADMIN_PASSWORD_WRONG:
        break;
      case errorTypes.UNAUTHORIZED:
        status = 401
        break;
      case errorTypes.CUREENT_ADMIN_NO_PERMISSION:
        status = 403
        break;
      default:
        status = 500
        message = message;
        break;
    }

    ctx.status = status;
    ctx.body = {
      code: status,
      message: message
    };
  }
};
