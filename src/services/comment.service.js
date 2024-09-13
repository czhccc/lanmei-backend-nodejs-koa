const connection = require('../app/database')

class CommentService {
  async comment(params) {
    const statement = `INSERT comment (comment, author) VALUES (?, ?)`
    const result = await connection.execute(statement, [
      params.comment, params.author
    ])
    
    return result[0]
  }

  async getCommentList(params) {
    `
      SELECT m.*, r.response AS responseContent, r.author AS responseAuthor, r.createTime AS responseTime
      FROM comment m
      LEFT JOIN (
          SELECT * FROM comment_response  WHERE (comment_id, createTime) IN (
              SELECT comment_id, MAX(createTime) 
              FROM comment_response 
              GROUP BY comment_id
          )
      ) r ON m.id = r.comment_id
      ORDER BY m.createTime DESC
    `
    // 用于存储查询参数
    const queryParams = [];
  
    // 动态构建查询条件
    let whereClause = ` WHERE 1=1`;  // 条件部分
  
    if (params.phone) {
      whereClause += ` AND phone LIKE ?`;
      queryParams.push(`%${params.phone}%`);
    }
  
    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM comment` + whereClause;
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数
  
    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;
  
    // 构建分页查询的 SQL 语句
    const statement = `SELECT * FROM comment` + whereClause + ` LIMIT ? OFFSET ?`;
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
}

module.exports = new CommentService()