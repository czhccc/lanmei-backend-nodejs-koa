const connection = require('../app/database')

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsIsSelling, goodsRemark = null, goodsRichText = null } = params;

    const statement = `INSERT INTO goods 
      (goods_name, goods_unit, goods_isSelling, goods_remark, goods_richText) 
      VALUES (?, ?, ?, ?, ?)`

    const result = await connection.execute(statement, [
      goodsName, goodsUnit, goodsIsSelling, goodsRemark, goodsRichText
    ])
    
    return result[0]
  }

  async updateGoods(params) {
    const { id, goodsName, goodsUnit, goodsIsSelling, goodsRemark = null, goodsRichText = null } = params;

    let statement = `
      UPDATE goods
      SET goods_name = ?, goods_unit = ?, goods_isSelling = ?
    `
    
    let queryParams = [goodsName, goodsUnit, goodsIsSelling]

    if (goodsRemark) {
      statement += `, goods_remark = ?`;
      queryParams.push(goodsRemark);
    }
    if (goodsRichText) {
      statement += `, goods_richText = ?`;
      queryParams.push(goodsRichText);
    }
    statement += ` WHERE id = ?`
    queryParams.push(id)

    const result = await connection.execute(statement, queryParams)
    
    return result[0]
  }

  async getGoodsDetailById(params) {
    const { id } = params

    const statement = `
      SELECT * FROM goods WHERE id = ?
    `
    
    const result = await connection.execute(statement, [id]);

    return result[0][0]
  }

  async getGoodsList(params) {
    const queryParams = [];

    let whereClause = ` WHERE 1=1`;

    // if (params.hasResponsed !== undefined) {
    //   if (params.hasResponsed === 'true') { // 在前端和后端之间通过 HTTP 请求传递参数时，尤其是在 GET 或 POST 请求的 URL 参数或请求体中，参数都会被转换成字符串格式。
    //     whereClause += ` AND r.response IS NOT NULL`;  // 只返回有回复的评论
    //   } else {
    //     whereClause += ` AND r.response IS NULL`;  // 只返回没有回复的评论
    //   }
    // }

    // 查询总记录数
    const countStatement = `SELECT COUNT(*) as total FROM goods`
    const totalResult = await connection.execute(countStatement, queryParams);
    const total = totalResult[0][0].total;  // 获取总记录数

    // 分页：根据 pageNo 和 pageSize 动态设置 LIMIT 和 OFFSET
    const pageNo = params.pageNo;
    const pageSize = params.pageSize;
    const offset = (pageNo - 1) * pageSize;

    // 构建分页查询的 SQL 语句
    const statement = `
      SELECT * FROM goods LIMIT ? OFFSET ?
    `

    queryParams.push(String(pageSize), String(offset));
    const result = await connection.execute(statement, queryParams);

    return {
      total,  // 总记录数
      records: result[0],  // 当前页的数据
    };
  }

}

module.exports = new GoodsService()