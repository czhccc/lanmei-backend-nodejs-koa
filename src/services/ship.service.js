const connection = require('../app/database')

const escapeLike = require('../utils/escapeLike')

const dayjs = require('dayjs');

const logger = require('../utils/logger');

class CommentService {
  async getAll(params) {
    const { level, code } = params

    let whereClause = ` WHERE 1=1`;
    const queryParams = [];

    if (level) {
      if (level!=='province' && level!=='city' && level!=='district') {
        throw new Error('level值错误')
      }
      whereClause += ` AND LEVEL = ?`
      queryParams.push(level)
    }
    if (code) {
      whereClause += ` AND code LIKE ?`
      queryParams.push(`${escapeLike(code)}%`)
    }

    try {
      const result = await connection.execute(`SELECT * FROM ship_areas ${whereClause}`, queryParams);

      return result[0];
    } catch (error) {
      logger.error('service error: getAll', { error })
      throw error;
    }
  }

  async changeUsable(params) {
    const { value, code } = params

    try {
      const result = await connection.execute(`
        UPDATE ship_areas SET usable = ? WHERE code LIKE ?
      `, [value, `${escapeLike(code)}%`]);

      return 'success';   
    } catch (error) {
      logger.error('service error: changeUsable', { error })
      throw error
    }
  }

  async getShipProvincesOfLastBatch(params) {
    const { goodsId } = params

    try {
      const [getShipProvincesOfLastBatchResult] = await connection.execute(`
        SELECT shipProvinces FROM batch_history WHERE goods_id = ? ORDER BY createTime DESC LIMIT 1
      `, [goodsId]);
  
      if (getShipProvincesOfLastBatchResult.length === 0) {
        throw new Error('无上一批次的配置')
      }
      const shipProvincesOfLastBatch = getShipProvincesOfLastBatchResult[0].shipProvinces
  
      const [getAllProvincesResult] = await connection.execute(`
        SELECT code, name, usable FROM ship_areas WHERE level='province'
      `, []);
  
      let unusableButChoosedProvince = []
      let finalResult = getAllProvincesResult.map(item => {
        let itemOfRules = shipProvincesOfLastBatch.find(el => el.code === item.code);
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
            baseQuantity: null,
            basePostage: null,
            extraQuantity: null,
            extraPostage: null,
            freeShippingQuantity: null,
          };
        }
        return null; // 显式返回 null 以避免 undefined
      }).filter(Boolean); // 过滤掉 null/undefined
      
      return {
        unusableButChoosedProvince,
        finalResult
      }   
    } catch (error) {
      logger.error('service error: getShipProvincesOfLastBatch', { error })
      throw error
    }
  }
}

module.exports = new CommentService()