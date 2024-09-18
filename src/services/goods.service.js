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

}

module.exports = new GoodsService()