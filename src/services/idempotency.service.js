const connection = require('../app/database')

const { generateIdempotencyKey } = require('../utils/idempotency')

const logger = require('../utils/logger');

class UtilService {
  async getIdempotencyKey(params) {
    const { thePhone, keyParams, keyPrefix } = params

    try {
      const idempotencyKey = generateIdempotencyKey({thePhone, ...keyParams}, keyPrefix)
      return {
        idempotencyKey
      }
    } catch (error) {
      logger.error('service', 'service error: getIdempotencyKey', { error })
      throw error
    }
  }
}

module.exports = new UtilService()