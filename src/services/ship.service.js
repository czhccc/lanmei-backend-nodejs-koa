const connection = require('../app/database')

const dayjs = require('dayjs')

class CommentService {
  async getAll(params) {
    let whereClause = ` WHERE 1=1`;
    const queryParams = [];

    if (params.level) {
      if (params.level!=='province' && params.level!=='city' && params.level!=='district') {
        throw new Error('level值错误')
      }
      whereClause += ` AND LEVEL = ?`
      queryParams.push(params.level)
    }
    const statement = `SELECT * FROM ship_areas` + whereClause;
    const result = await connection.execute(statement, queryParams);

    return result[0];
  }

  async changeUsable(params) {
    try {
      const statement = `UPDATE ship_areas SET usable = ? WHERE code LIKE ?`;
      const result = await connection.execute(statement, [params.value, `${params.code}%`]);

      return 'success';   
    } catch (error) {
      console.log(error)
      throw new Error('mysql操作失败')
    }
  }

  async getPostageOfLastBatch(params) {
    const getPostageOfLastBatchStatement = `SELECT postage FROM batch_history WHERE goods_id = ? ORDER BY createTime DESC LIMIT 1`;
    const getPostageOfLastBatchResult = await connection.execute(getPostageOfLastBatchStatement, [params.goodsId]);
    const postageOfLastBatch = getPostageOfLastBatchResult[0][0].postage
    if (!postageOfLastBatch) {
      return '无数据'
    }

    const getAllProvincesStatement = `SELECT * FROM ship_areas WHERE level='province'`;
    const getAllProvincesResult = await connection.execute(getAllProvincesStatement, []);
    const allProvinces = getAllProvincesResult[0]

    let unusableButChoosedProvince = []
    let finalResult = allProvinces.map(item => {
      let itemOfRules = postageOfLastBatch.find(el => el.code === item.code);
      if (itemOfRules) {
        if (!item.usable) {
          unusableButChoosedProvince.push(item.name)
        }
        return { ...itemOfRules, isChoosed: true };
      }

      if (item.usable) {
        return {
          code: item.code,
          name: item.name,
          isChoosed: false,
          baseNum: null,
          basePostage: null,
          extraNum: null,
          extraPostage: null,
          freeShippingNum: null,
        };
      }
      return null; // 显式返回 null 以避免 undefined
    }).filter(Boolean); // 过滤掉 null/undefined
    
    console.log(unusableButChoosedProvince);
    console.log(finalResult);
    return {
      unusableButChoosedProvince,
      finalResult
    }
  }
}

module.exports = new CommentService()