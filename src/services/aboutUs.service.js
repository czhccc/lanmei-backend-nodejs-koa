const connection = require('../app/database')

class AboutUsService {
  async updateAboutUs(params) {
    const queryStatement = `SELECT COUNT(*) as total FROM aboutUs`
    const queryResult = await connection.execute(queryStatement, [])

    if (queryResult[0][0].total !== 0) { // 有值，更新
      const statement = `
        UPDATE aboutUs
        SET address = ?, contact = ?, aboutUs = ?
        WHERE id = ?
      `

      const result = await connection.execute(statement, [
        JSON.stringify(params.address),
        JSON.stringify(params.contact),
        params.aboutUs,
        1
      ])

      return result[0]
    } else { // 没值，插入
      const statement = `INSERT aboutUs (address, contact, aboutUs, id) VALUES (?,?,?,?)`

      const result = await connection.execute(statement, [
        JSON.stringify(params.address),
        JSON.stringify(params.contact),
        params.aboutUs,
        1
      ])

      return result[0]
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