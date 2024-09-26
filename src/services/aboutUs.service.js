const fs = require('fs');
const path = require('path');

const connection = require('../app/database')

const richTextExtractImageSrc = require('../utils/richTextExtractImageSrc')

class AboutUsService {
  async updateAboutUs(params) {
    const imgSrcList = richTextExtractImageSrc(params.aboutUs)
    console.log(imgSrcList)

    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const deleteStatement = `DELETE FROM other_file WHERE type = 'aboutUs'`
      const imgUrlResult = await conn.execute(deleteStatement, [])

      for (const item of imgSrcList) {
        const insertStatement = `INSERT other_file (url, type) VALUES (?,?)`
        const queryResult = await conn.execute(insertStatement, [item, 'aboutUs'])
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
          params.aboutUs,
          1
        ])
      } else { // 没值，插入
        const statement = `INSERT aboutUs (address, contact, aboutUs, id) VALUES (?,?,?,?)`

        const result = await conn.execute(statement, [
          JSON.stringify(params.address),
          JSON.stringify(params.contact),
          params.aboutUs,
          1
        ])
      }

      await conn.commit();

      // // 删除指定的文件
      // let filesFolderPath = path.join(__dirname, '..', '..', 'files');
      // fs.readdir(filesFolderPath, (err, files) => {
      //   if (err) {
      //     throw new Error('读取文件目录失败')
      //   }
    
      //   files.forEach(file => {
      //     let keep = false
      //     imgSrcList.forEach(url => {
      //       let urlFilename = path.basename(new URL(url).pathname)
      //       if (file === urlFilename) {
      //         keep = true
      //       }
      //     })
      //     if (!keep) {
      //       const filePath = path.join(filesFolderPath, file);
      //       console.log('filePath', filePath);

      //       fs.unlink(filePath, (err) => {
      //         if (err) {
      //           throw new Error('删除文件失败')
      //         }
      //       })
      //     }
      //   });
      // })

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

  async getAboutUs() {
    const statement = `SELECT * from aboutUs WHERE id=1`

    const result = await connection.execute(statement, [])
    // 数据库存的是json格式，mysql2查询后自动解析
    return result[0]
  }
}

module.exports = new AboutUsService()