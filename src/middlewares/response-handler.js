const logger = require('../utils/logger');

module.exports = async (ctx, next) => {
  try {
    await next();
    // console.log(ctx.body);
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
      // 根据ctx.status生成对应的错误信息
      const status = ctx.status || 404;
      let message;
      switch (status) {
        case 404:
          message = '路由未找到';
          break;
        case 401:
          message = '未授权';
          break;
        case 403:
          message = '无权限';
          break;
        // 可根据需要扩展其他状态码
        default:
          message = '请求处理失败';
          break;
      }
      ctx.body = {
        code: status,
        message: message
      };
      // 确保返回的HTTP状态码与code一致
      ctx.status = status;
    }
  } catch (error) {
    logger.error('response-handler 捕获错误：', { error })

    let status = 400;
    let message = error.message || '未知错误！！！'

    switch (error.message) {
      case '未授权':
        status = 401
        break;
      case '无权限':
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
