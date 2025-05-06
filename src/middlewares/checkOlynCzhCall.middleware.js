const logger = require('../utils/logger');

const customError = require('../utils/customError')

const config = require('../app/config')

const checkOlynCzhCall = async (ctx, next) => {

  const thePhone = ctx.theUser.phone
  
  try {
    if (thePhone !== config.czhAdminPhone) {
      logger.error('checkOlynCzhCall', 'checkOlynCzhCall', { thePhone, path: ctx.path })
      throw new customError.IllegalCallError(ctx.path, { thePhone, path: ctx.path })
    } else {
      await next()
    }
  } catch (error) {
    throw error
  }
}

module.exports = checkOlynCzhCall