const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const {
  BASE_URL
} = require('../app/config')

class AboutUsService {
  async updateAboutUs(params) {
    let { aboutUs } = params

    let savedAboutUs = aboutUs.replaceAll(BASE_URL, 'BASE_URL')

    const imgSrcList = richTextExtractImageSrc(aboutUs).map(url => url.replace(`${BASE_URL}/`, ''));

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      // 仅当 imgSrcList 非空时才执行删除操作，减少数据库 IO
      if (imgSrcList.length > 0) {
        await conn.execute(`DELETE FROM about_us_images`);
      }

      // 批量插入图片链接，提高效率
      if (imgSrcList.length > 0) {
        const values = imgSrcList.map(() => '(?)').join(',');
        const insertStatement = `INSERT INTO about_us_images (url) VALUES ${values}`;
        await conn.execute(insertStatement, imgSrcList);
      }

      // 使用 EXISTS 替代 COUNT(*)，提高查询效率
      const queryStatement = `SELECT EXISTS(SELECT 1 FROM aboutUs LIMIT 1) AS hasData`;
      const [queryResult] = await conn.execute(queryStatement);
      const hasData = queryResult[0].hasData === 1;

      if (hasData) { // 更新数据
        const updateStatement = `
          UPDATE aboutUs
          SET address = ?, contact = ?, aboutUs = ?
          WHERE id = 1
        `;
        await conn.execute(updateStatement, [
          JSON.stringify(params.address),
          JSON.stringify(params.contact),
          savedAboutUs
        ]);
      } else { // 插入数据
        const insertStatement = `INSERT INTO aboutUs (address, contact, aboutUs, id) VALUES (?,?,?,1)`;
        await conn.execute(insertStatement, [
          JSON.stringify(params.address),
          JSON.stringify(params.contact),
          savedAboutUs
        ]);
      }

      await conn.commit();

      return 'success'
    } catch (error) {
      await conn.rollback();
      console.log(error);
      throw new Error('mysql事务失败，已回滚');
    } finally {
      if (conn) conn.release();
    }
  }

  async getAboutUs() {
    const [result] = await connection.execute(`SELECT * FROM aboutUs WHERE id=1`);
    if (result.length === 0) 
      return null;

    result[0].aboutUs = result[0].aboutUs.replaceAll('BASE_URL', BASE_URL);
    return result[0];
  }
}

module.exports = new AboutUsService()