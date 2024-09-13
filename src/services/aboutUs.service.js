const connection = require('../app/database')

class LoginService {
  async updateAboutUs(params) {
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
  }

  async getAboutUs() {
    const statement = `SELECT * from aboutUs WHERE id=1`

    const result = await connection.execute(statement, [])
    // 数据库存的是json格式，mysql2查询后自动解析
    return result[0]
  }
}

module.exports = new LoginService()