const connection = require('../app/database')

class GoodsService {
  async createGoods(params) {
    const { goodsName, goodsUnit, goodsIsSelling, goodsRemark = null, goodsRichText = '<p>暂无更多介绍</p>', swiperList = [] } = params;
    
    // 获取连接并开启事务
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {

      // require 的文件中已经通过 getConnection 获取过连接，但这个过程仅仅是检查连接池是否成功创建，并不会对后续的事务操作产生影响。
      // 即使已经调用过 getConnection，在具体的业务逻辑中，仍然需要通过 connections.getConnection() 获取一个新的连接实例来开启事务。连接池的设计就是为了能够高效地管理和复用数据库连接。
      await conn.beginTransaction();  // 开启事务

      const statement1 = `INSERT goods 
        (goods_name, goods_unit, goods_isSelling, goods_remark, goods_richText) 
        VALUES (?, ?, ?, ?, ?)`;

      const result1 = await conn.execute(statement1, [
        goodsName, goodsUnit, goodsIsSelling, goodsRemark, goodsRichText
      ]);

      if (swiperList.length > 0) {
        const createdGoodsId = result1[0].insertId

        const statement2 = `INSERT goods_swiper (goods_id, url, position, type) VALUES (?, ?, ?, ?)`;
        
        for (let index = 0; index < swiperList.length; index++) {
          const swiperItem = swiperList[index];
          await conn.execute(statement2, [createdGoodsId, swiperItem.url, index, swiperItem.type==='image'?0:1])
        }
      }

      // 提交事务
      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      conn.release();
    }
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
      SELECT 
        goods.*, 
        goods_swiper.*,
        goods.id AS goods_id, 
        goods_swiper.id AS swiper_id
      FROM goods
      LEFT JOIN goods_swiper ON goods.id = goods_swiper.goods_id
      WHERE goods.id = ?
    `
    
    const result = await connection.execute(statement, [id]);

    console.log('00000000000000', result[0])

    let goods = {
      goodsId: result[0][0].goods_id,
      goodsName: result[0][0].goods_name,
      goodsUnit: result[0][0].goods_unit,
      goodsIsSelling: result[0][0].goods_isSelling,
      goodsRemark: result[0][0].goods_remark,
      goodsRichText: result[0][0].goods_richText,
      swiperList: result[0].map(item => {
        return {
          id: item.swiper_id,
          url: item.url,
          type: item.type===1?'video':'image',
          position: item.position
        }
      })
    }

    return goods
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