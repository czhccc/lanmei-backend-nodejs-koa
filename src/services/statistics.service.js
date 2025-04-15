const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const dayjs = require('dayjs');

const {
  BASE_URL
} = require('../app/config')

class GoodsService {
  // async getSingleBatchStatistics(params) {
    
  //   const statement1 = `
  //     SELECT * FROM orders
  //   `

  //   const result1 = await connection.execute(statement1, []);

  //   return result1[0]
  // }
}

module.exports = new GoodsService()