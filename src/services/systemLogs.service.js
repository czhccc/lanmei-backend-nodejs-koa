const connection = require('../app/database')

const escapeLike = require('../utils/escapeLike')

const logger = require('../utils/logger')

class SystemLogsService {
  async getSystemLogsList(params) {
    const {level, moduleType, startTime, endTime, pageNo, pageSize} = params

    let whereClause = ` WHERE 1=1`;
    const queryParams = [];
    
    if (level) {
      whereClause += ` AND level = ?`;
      queryParams.push(level);
    }
    if (moduleType) {
      whereClause += ` AND moduleType LIKE ?`;
      queryParams.push(`%${escapeLike(moduleType)}%`);
    }
    if (startTime || endTime) {
      whereClause += ` AND (timestamp >= ? OR ? IS NULL) AND (timestamp <= ? OR ? IS NULL)`
      queryParams.push(params.startTime || null, params.startTime || null, params.endTime || null, params.endTime || null)
    }

    try {
      const totalResult = await connection.execute(
        `SELECT COUNT(*) as total FROM system_logs ${whereClause}`, 
        queryParams
      );
      const total = totalResult[0][0].total;
    
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
    
      queryParams.push(String(pageSizeInt), String(offset));
      const result = await connection.execute(
        `SELECT * FROM system_logs ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, 
        queryParams
      );
    
      return {
        total,
        records: result[0],
      };   
    } catch (error) {
      logger.error('service', 'service error: getSystemLogsList', { error })

      throw error
    }
  }

  async deleteSystemLogs(params) {
    const { ids } = params

    try {
      await connection.execute(`DELETE FROM system_logs WHERE id IN (${ids.map(() => '?')})`, ids);

      return '删除成功'
    } catch (error) {
      logger.error('service', 'service error: deleteSystemLogs', { error })

      throw error
    }
  }

  async deleteSystemLogsByTime(params) {
    const { startTime, endTime } = params

    try {
      await connection.execute(`DELETE FROM system_logs WHERE timestamp >= ? AND timestamp <= ?`, [startTime, endTime]);

      return '删除成功'
    } catch (error) {
      logger.error('service', 'service error: deleteSystemLogsByTime', { error })

      throw error
    }
  }
}

module.exports = new SystemLogsService()