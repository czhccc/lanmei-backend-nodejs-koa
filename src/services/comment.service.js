const connection = require('../app/database')

const dayjs = require('dayjs')

class CommentService {
  async comment(params) {
    const { author, comment } = params;

    if (!author) {
      throw new Error('缺少参数：author')
    }
    if (!comment) {
      throw new Error('缺少参数：comment')
    }

    const conn = await connection.getConnection();
    try {
      // 查询今天已留言次数
      const queryTodayCommentTimesStatement = `
        SELECT COUNT(*) AS count 
        FROM comment 
        WHERE author = ? 
          AND createTime >= CURDATE() 
          AND createTime < CURDATE() + INTERVAL 1 DAY
      `;
      const [queryResult] = await conn.execute(queryTodayCommentTimesStatement, [author]);
      const todayCommentCount = queryResult[0].count;

      // 限制每天最多 10 条留言
      if (todayCommentCount >= 10) {
        throw new Error('今日留言次数已达上限')
      }

      // 插入留言记录
      const insertResult = await conn.execute(`INSERT comment (comment, author) VALUES (?, ?)`, 
        [comment, author]
      )

      return 'success'
    } catch (error) {
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getCommentList(params) {
    const { pageNo, pageSize, hasResponsed } = params;

    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    if (hasResponsed !== undefined) {
      if (String(hasResponsed) === 'true') { // 在前端和后端之间通过 HTTP 请求传递参数时，尤其是在 GET 或 POST 请求的 URL 参数或请求体中，参数都会被转换成字符串格式。
        whereClause += ` AND r.response IS NOT NULL`;  // 只返回有回复的评论
      } else {
        whereClause += ` AND r.response IS NULL`;  // 只返回没有回复的评论
      }
    }

    // 查询总记录数
    const countStatement = `
      SELECT COUNT(*) as total 
      FROM comment m
      LEFT JOIN (
          SELECT comment_id, MAX(createTime) AS latestTime 
          FROM comment_response 
          GROUP BY comment_id
      ) latest ON m.id = latest.comment_id
      LEFT JOIN comment_response r ON latest.comment_id = r.comment_id AND latest.latestTime = r.createTime
    ` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    // 构建分页查询的 SQL 语句
    const statement = `
          SELECT m.id AS commentId, 
                  m.comment, 
                  m.author AS commentAuthor, 
                  m.createTime AS commentTime, 
                  r.response, 
                  r.author AS responseAuthor, 
                  r.createTime AS responseTime
          FROM comment m
          LEFT JOIN (
              SELECT comment_id, MAX(createTime) AS latestTime 
              FROM comment_response 
              GROUP BY comment_id
          ) latest ON m.id = latest.comment_id
          LEFT JOIN comment_response r ON latest.comment_id = r.comment_id AND latest.latestTime = r.createTime
      ` + whereClause + 
      ` ORDER BY 
          CASE WHEN r.response IS NULL THEN 0 ELSE 1 END ASC,  -- 没有回复的留言在前面
          commentTime DESC                                    -- 按留言时间从新到旧排序
      LIMIT ? OFFSET ?
    `;

    queryParams.push(String(pageSizeInt), String(offset));
    const [result] = await connection.execute(statement, queryParams);

    return {
      total,
      records: result,
    };
  }

  async response(params) {
    const { commentId, response, author } = params;

    if (!commentId) {
      throw new Error('缺少参数：commentId')
    }
    if (!response) {
      throw new Error('缺少参数：response')
    }
    if (!author) {
      throw new Error('缺少参数：author')
    }

    try {
      const [commentExists] = await connection.execute(`SELECT id FROM comment WHERE id = ? LIMIT 1`, [commentId]);
      if (commentExists.length === 0) {
        throw new Error('评论不存在')
      }

      const result = await connection.execute(`INSERT comment_response (comment_id, response, author) VALUES (?, ?, ?)`, 
        [commentId, response, author]
      )
      return 'success'
    } catch (error) {
      throw error
    }
  }

  async getCommentDetailById(params) {
    const { commentId } = params;

    if (!params.commentId) {
      throw new Error('缺少参数：commentId')
    }

    const statement = `
      SELECT 
        m.id commentId, m.comment, m.author commentAuthor, m.createTime commentTime,
        r.id responseId, r.response, r.author responseAuthor, r.createTime responseTime
      FROM comment m
      LEFT JOIN comment_response r ON m.id = r.comment_id
      WHERE m.id = ?
      ORDER BY r.createTime ASC;
    `;
    
    try {
      const [result] = await connection.execute(statement, [commentId]);
    
      if (result.length === 0) {
        throw new Error('评论不存在')
      }
      const comment = {
        commentId: result[0]?.commentId,
        comment: result[0]?.comment,
        commentAuthor: result[0]?.commentAuthor,
        commentTime: result[0]?.commentTime,
        responses: result
                    .filter(record => record.response) // 过滤掉 `null` 回复
                    .map(record => ({
                      responseId: record.responseId,
                      response: record.response,
                      responseAuthor: record.responseAuthor,
                      responseTime: record.responseTime
                    }))
      };
      
      return comment
    } catch (error) {
      throw error
    }
  }

  async getCommentListByWechat(params) {
    const { pageNo, pageSize, hasResponsed } = params;

    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    if (hasResponsed !== undefined) {
      whereClause += hasResponsed === 'true' ? " AND r.response IS NOT NULL" : " AND r.response IS NULL";
    }

    const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
    const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;

    const statement = `
      SELECT 
        m.id commentId, m.comment, m.author commentAuthor, m.createTime commentTime,
        r.id responseId, r.response, r.author responseAuthor, r.createTime responseTime
          FROM comment m
            LEFT JOIN comment_response r ON m.id = r.comment_id
              ${whereClause} 
                ORDER BY commentTime DESC    -- 按留言时间从新到旧排序
                  LIMIT ? OFFSET ?
    `;

    queryParams.push(String(pageSizeInt), String(offset));

    try {
      const [rows] = await connection.execute(statement, queryParams);

      const groupedData = rows.reduce((acc, item) => {
        const { commentId, comment, commentAuthor, commentTime, responseId, response, responseAuthor, responseTime } = item;

        if (!acc[commentId]) {
          acc[commentId] = {
            commentId,
            comment,
            commentAuthor,
            commentTime: dayjs(commentTime).format('YYYY-MM-DD HH:mm:ss'),
            responses: []
          };
        }

        if (responseId) {
          acc[commentId].responses.push({
            responseId,
            response,
            responseAuthor,
            responseTime: dayjs(responseTime).format('YYYY-MM-DD HH:mm:ss')
          });
        }

        return acc;
      }, {});

      return { records: Object.values(groupedData) };
    } catch (error) {
      throw error;
    }
  }

  async getUserComments(params) {
    const { author, startTime, endTime } = params

    if (!author) {
      throw new Error('缺少参数：author')
    }

    let statement = `
      SELECT 
        m.id AS commentId, 
        m.comment, 
        m.author AS commentAuthor, 
        m.createTime AS commentTime,
        r.id AS responseId, 
        r.response, 
        r.author AS responseAuthor, 
        r.createTime AS responseTime
      FROM comment m
      LEFT JOIN comment_response r ON m.id = r.comment_id
      WHERE m.author = ?
    `;
    const values = [author];

    if (startTime) {
      statement += ` AND m.createTime >= ?`;
      values.push(startTime);
    }
    if (endTime) {
      statement += ` AND m.createTime <= ?`;
      values.push(endTime);
    }

    statement += ` ORDER BY commentTime DESC`;

    try {
      const [rows] = await connection.execute(statement, values);

      const groupedData = rows.reduce((acc, item) => {
        const { commentId, comment, commentAuthor, commentTime, responseId, response, responseAuthor, responseTime } = item;

        if (!acc[commentId]) {
          acc[commentId] = {
            commentId,
            comment,
            commentAuthor,
            commentTime: dayjs(commentTime).format("YYYY-MM-DD HH:mm:ss"),
            responses: []
          };
        }

        if (responseId) {
          acc[commentId].responses.push({
            responseId,
            response,
            responseAuthor,
            responseTime: dayjs(responseTime).format("YYYY-MM-DD HH:mm:ss")
          });
        }

        return acc;
      }, {});

      // **确保最终数组仍然按 `commentTime` 倒序排列**
      const records = Object.values(groupedData).sort((a, b) => b.commentTime.localeCompare(a.commentTime));

      return { 
        records 
      };
    } catch (error) {
      throw error;
    }
  }

}

module.exports = new CommentService()