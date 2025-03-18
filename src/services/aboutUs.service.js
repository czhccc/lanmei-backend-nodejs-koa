const fs = require('fs');
const path = require('path');

const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

const {
  BASE_URL
} = require('../app/config')

class AboutUsService {
  async updateAboutUs(params) {
    let aboutUs = params.aboutUs

    let savedAboutUs = aboutUs.replaceAll(BASE_URL, 'BASE_URL')

    const imgSrcList = richTextExtractImageSrc(aboutUs).map(url => {
      return url.replace(`${BASE_URL}/`, '')
    })
    console.log('imgSrcList', imgSrcList)

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const deleteStatement = `DELETE FROM about_us_images`
      const imgUrlResult = await conn.execute(deleteStatement, [])

      for (const item of imgSrcList) {
        const insertStatement = `INSERT about_us_images (url) VALUES (?)`
        const queryResult = await conn.execute(insertStatement, [item])
      }

      const queryStatement = `SELECT COUNT(*) as total FROM aboutUs`
      const queryResult = await conn.execute(queryStatement, [])

      if (queryResult[0][0].total !== 0) { // 有值，更新
        const statement = `
          UPDATE aboutUs
          SET address = ?, contact = ?, aboutUs = ?
          WHERE id = ?
        `

        const result = await conn.execute(statement, [
          JSON.stringify(params.address),
          JSON.stringify(params.contact),
          savedAboutUs,
          1
        ])
      } else { // 没值，插入
        const statement = `INSERT aboutUs (address, contact, aboutUs, id) VALUES (?,?,?,?)`

        const result = await conn.execute(statement, [
          JSON.stringify(params.address),
          JSON.stringify(params.contact),
          savedAboutUs,
          1
        ])
      }

      await conn.commit();

      return 'success'
    } catch (error) {
      // 出现错误时回滚事务
      await conn.rollback();
      throw new Error('mysql事务失败，已回滚');
    } finally {
      // 释放连接
      if (conn) conn.release();
    }
  }

  async getAboutUs() {
    const statement = `SELECT * from aboutUs WHERE id=1`

    const result = await connection.execute(statement, [])

    // 数据库存的是json格式，mysql2查询后自动解析

    result[0][0].aboutUs = result[0][0].aboutUs.replaceAll('BASE_URL', BASE_URL)

    return result[0][0]
  }
}

module.exports = new AboutUsService()