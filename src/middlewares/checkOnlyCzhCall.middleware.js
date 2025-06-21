const logger = require('../utils/logger');

const customError = require('../utils/customError')

const config = require('../app/config')

const checkOlynCzhCall = async (ctx, next) => {
  const thePhone = ctx.theUser.phone
  const phone = ctx.request.body.phone || ctx.request.query.phone
  
  try {
    if (thePhone !== config.czhAdminPhone) {
      logger.error('createOrUpdateAdmin', '非czhAdminPhone的账号调用admin接口', {
        from: thePhone,
        path: ctx.path,
        phone
      });

      throw new customError.IllegalCallError({ thePhone, path: ctx.path })
    }

    if (phone === config.czhAdminPhone) {
      logger.error('createOrUpdateAdmin', '有人尝试操作czhAdminPhone的账号', {
        from: thePhone,
        path: ctx.path,
        phone
      });
      throw new customError.IllegalCallError({ thePhone, path: ctx.path })
    }

    await next()
  } catch (error) {
    throw error
  }
}

module.exports = checkOlynCzhCall