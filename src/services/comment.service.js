const connection = require('../app/database')

const dayjs = require('dayjs')

class CommentService {
  async comment(params) {
    
    const queryTodayCommentTimesStatement = `
      SELECT * 
      FROM comment 
      WHERE author = ? 
        AND createTime >= CURDATE() 
        AND createTime < CURDATE() + INTERVAL 1 DAY
    `
    const queryTodayCommentTimesResult = await connection.execute(queryTodayCommentTimesStatement, [params.author])
    if (queryTodayCommentTimesResult[0].length >= 10) {
      return '今日留言次数已达上限'
    }

    const statement = `INSERT comment (comment, author) VALUES (?, ?)`
    const result = await connection.execute(statement, [
      params.comment, params.author
    ])
    
    return result[0]
  }

  async getCommentList(params) {
    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    if (params.hasResponsed !== undefined) {
      if (String(params.hasResponsed) === 'true') { // 在前端和后端之间通过 HTTP 请求传递参数时，尤其是在 GET 或 POST 请求的 URL 参数或请求体中，参数都会被转换成字符串格式。
        whereClause += ` AND r.response IS NOT NULL`;  // 只返回有回复的评论
      } else {
        whereClause += ` AND r.response IS NULL`;  // 只返回没有回复的评论
      }
    }

    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM comment m
                            LEFT JOIN (
                                SELECT * FROM comment_response WHERE (comment_id, createTime) IN (
                                    SELECT comment_id, MAX(createTime)
                                    FROM comment_response 
                                    GROUP BY comment_id
                                )
                            ) r ON m.id = r.comment_id` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;

    // 构建分页查询的 SQL 语句
    const statement = `
      SELECT m.id AS commentId, m.comment, m.author AS commentAuthor, m.createTime AS commentTime, r.response, r.author AS responseAuthor, r.createTime AS responseTime
      FROM comment m
      LEFT JOIN (
          SELECT * FROM comment_response WHERE (comment_id, createTime) IN (
              SELECT comment_id, MAX(createTime) 
              FROM comment_response 
              GROUP BY comment_id
          )
      ) r ON m.id = r.comment_id
    ` + whereClause + 
    ` ORDER BY 
      CASE WHEN r.response IS NULL THEN 0 ELSE 1 END ASC,  -- 没有回复的留言在前面
      commentTime DESC                                   -- 按留言时间从新到旧排序
    LIMIT ? OFFSET ?`;

    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);

    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }


  async response(params) {
    const statement = `INSERT comment_response (comment_id, response, author) VALUES (?, ?, ?)`

    const result = await connection.execute(statement, [
      params.commentId, params.response, params.author
    ])
    
    return result[0]
  }

  async getCommentDetailById(params) {
    const statement = `
      SELECT m.id commentId, m.comment, m.author commentAuthor, m.createTime commentTime,
            r.id responseId, r.response, r.author responseAuthor, r.createTime responseTime
      FROM comment m
      LEFT JOIN comment_response r ON m.id = r.comment_id
      WHERE m.id = ?
      ORDER BY r.createTime ASC;
    `;
    
    const result = await connection.execute(statement, [params.commentId]);
      
    const comment = {
      commentId: result[0][0]?.commentId,
      comment: result[0][0]?.comment,
      commentAuthor: result[0][0]?.commentAuthor,
      commentTime: result[0][0]?.commentTime,
      responses: []
    };

    result[0].forEach(record => {
      if (record.response) {
        comment.responses.push({
          responseId: record.responseId,
          response: record.response,
          responseAuthor: record.responseAuthor,
          responseTime: record.responseTime
        });
      }
    });
    
    return comment
  }

  async getCommentListByWechat(params) {
    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    if (params.hasResponsed !== undefined) {
      if (String(params.hasResponsed) === 'true') { // 在前端和后端之间通过 HTTP 请求传递参数时，尤其是在 GET 或 POST 请求的 URL 参数或请求体中，参数都会被转换成字符串格式。
        whereClause += ` AND r.response IS NOT NULL`;  // 只返回有回复的评论
      } else {
        whereClause += ` AND r.response IS NULL`;  // 只返回没有回复的评论
      }
    }

    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;

    // 构建分页查询的 SQL 语句
    const statement = `
      SELECT m.id commentId, m.comment, m.author commentAuthor, m.createTime commentTime,
            r.id responseId, r.response, r.author responseAuthor, r.createTime responseTime
      FROM comment m
      LEFT JOIN comment_response r ON m.id = r.comment_id
    ` + whereClause + 
    ` ORDER BY 
      commentTime DESC    -- 按留言时间从新到旧排序
    LIMIT ? OFFSET ?`;

    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);

    // 新的数据结构对象
    const groupedData = {};

    // 遍历原数据数组
    result[0].forEach(item => {
      const { commentId, comment, commentAuthor, commentTime, responseId, response, responseAuthor, responseTime } = item;

      // 如果commentId尚不存在，初始化评论对象
      if (!groupedData[commentId]) {
        groupedData[commentId] = {
          commentId,
          comment,
          commentAuthor,
          commentTime: dayjs(commentTime).format('YYYY-MM-DD HH:mm:ss'),
          responses: [] // 存储回复的数组
        };
      }

      // 如果存在回复，则加入responses数组
      if (responseId !== null) {
        groupedData[commentId].responses.push({
          responseId,
          response,
          responseAuthor,
          responseTime: dayjs(responseTime).format('YYYY-MM-DD HH:mm:ss')
        });
      }
    });

    // 将对象转为数组格式
    const records = Object.values(groupedData).sort((a, b) => b.commentId - a.commentId);

    return {
      records  // 当前页的数据
    };
  }

  async getUserAllComments(params) {
    const statement = `
      SELECT m.id commentId, m.comment, m.author commentAuthor, m.createTime commentTime,
            r.id responseId, r.response, r.author responseAuthor, r.createTime responseTime
      FROM comment m
      LEFT JOIN comment_response r ON m.id = r.comment_id
      WHERE m.author = ?
      ORDER BY commentTime DESC 
    `

    const result = await connection.execute(statement, [params.author]);

    // 新的数据结构对象
    const groupedData = {};

    // 遍历原数据数组
    result[0].forEach(item => {
      const { commentId, comment, commentAuthor, commentTime, responseId, response, responseAuthor, responseTime } = item;

      // 如果commentId尚不存在，初始化评论对象
      if (!groupedData[commentId]) {
        groupedData[commentId] = {
          commentId,
          comment,
          commentAuthor,
          commentTime: dayjs(commentTime).format('YYYY-MM-DD HH:mm:ss'),
          responses: [] // 存储回复的数组
        };
      }

      // 如果存在回复，则加入responses数组
      if (responseId !== null) {
        groupedData[commentId].responses.push({
          responseId,
          response,
          responseAuthor,
          responseTime: dayjs(responseTime).format('YYYY-MM-DD HH:mm:ss')
        });
      }
    })

    // 将对象转为数组格式
    const records = Object.values(groupedData).sort((a, b) => b.commentId - a.commentId);

    return {
      records,  // 当前页的数据
    };
  }

}

module.exports = new CommentService()