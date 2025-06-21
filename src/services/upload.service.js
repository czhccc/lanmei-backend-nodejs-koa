const connection = require('../app/database')

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs');

const logger = require('../utils/logger');

const customError = require('../utils/customError')

const getCOSTemporaryKey = require('../utils/getCOSTemporaryKey')

class CommentService {
  async getCOSTemporaryKey(params) {
    const { token } = params

    try {
      const result = getCOSTemporaryKey(token)

      return result;   
    } catch (error) {
      logger.error('service', 'service error: getCOSTemporaryKey', { error })
      throw error
    }
  }
  
}

module.exports = new CommentService()