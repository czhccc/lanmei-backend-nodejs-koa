// response-handler.js
const errorTypes = require('../../constants/error-types');

module.exports = async (ctx, next) => {
  try {
    // 继续调用后面的中间件
    await next();  // 这个地方get请求请求体有点问题
    if (ctx.body) {
      ctx.body = {
        code: 200,  // 成功返回
        data: ctx.body,  // 原本的响应数据
        message: 'Success'  // 成功消息
      };
    } else {
      console.log('ctx.body is null ctx.body is null ctx.body is null');
      ctx.body = {
        code: 404,  // 资源未找到
        data: null,
        message: 'ctx.body is null'  // 404 错误消息
      };
    }
  } catch (err) {
    console.error('response-handler error 捕获', err.message);  // 打印错误日志

    let status = 400;  // 默认状态码
    let message = err.message || '未知错误！！！';  // 默认错误信息

    // 根据错误类型处理不同的状态码和信息
    switch (err.message) {
      case errorTypes.NECESSARY_PARAM_IS_NULL:
        break;
      case errorTypes.UNIQUE_FIELD_DUPLICATE:
        break;
      case errorTypes.ADMIN_NOT_EXIST:
        break;
      case errorTypes.ADMIN_PASSWORD_WRONG:
        break;
      case errorTypes.UNAUTHORIZED: // token 失效
        status = 401;
        break;
      case errorTypes.CUREENT_ADMIN_NO_PERMISSION:
        status = 403;
        break;
      default:
        status = 500;
        message = message;
        break;
    }

    // 处理错误时的响应格式
    ctx.status = status;
    ctx.body = {
      code: status,
      data: null,
      message: message
    };
  }
};
