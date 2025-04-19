const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const {
  BASE_URL
} = require('../app/config')

const redisUtils = require('../utils/redisUtils')

const logger = require('../utils/logger')

class AboutUsService {
  async updateAboutUs(params) {
    let { aboutUs } = params

    let savedAboutUs = String(aboutUs || '')?.replaceAll(BASE_URL, 'BASE_URL') || null

    const imgSrcList = richTextExtractImageSrc(aboutUs).map(url => url.replace(`${BASE_URL}/`, ''));

    let conn = null;
    try {
      conn = await connection.getConnection();
      await conn.beginTransaction();  // 开启事务

      // 仅当 imgSrcList 非空时才执行删除操作，减少数据库 IO
      if (imgSrcList.length > 0) {
        await conn.execute(`DELETE FROM aboutus_images`);
      }

      // 批量插入图片链接，提高效率
      if (imgSrcList.length > 0) {
        const values = imgSrcList.map(() => '(?)').join(',');
        const insertStatement = `INSERT INTO aboutus_images (url) VALUES ${values}`;
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

      await redisUtils.setWithVersion('aboutUs', {
        address: params.address,
        contact: params.contact,
        aboutUs: savedAboutUs
      });

      await conn.commit();

      return '更新成功'
    } catch (error) {
      await conn.rollback();

      logger.error('service', 'service error: updateAboutUs', { error })
      
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getAboutUs() {
    try {
      const redisData = await redisUtils.getWithVersion('aboutUs');

      if (redisData) {
        return redisData;
      }
      
      const [result] = await connection.execute(`SELECT * FROM aboutUs WHERE id=1`);
      if (result.length === 0) 
        return null;

      result[0].aboutUs = result[0].aboutUs.replaceAll('BASE_URL', BASE_URL);

      await redisUtils.setWithVersion('aboutUs', result[0]);

      return result[0];   
    } catch (error) {
      logger.error('service', 'service error: getAboutUs', { error })
      
      throw error
    }
  }
}

module.exports = new AboutUsService()