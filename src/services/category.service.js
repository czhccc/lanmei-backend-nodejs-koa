const connection = require('../app/database')

class AboutUsService {
  async updateCategory(params) {
    console.log(params);
    const conn = await connection.getConnection();  // 从连接池获取连接
    try {
      await conn.beginTransaction();  // 开启事务

      const deleteStatement = `DELETE FROM category`
      const deleteResult = await conn.execute(deleteStatement, [])

      let length = []
      let nodes = []
      let id = 1
      params.treeData.forEach((item, index) => {
        let tempId = id
        nodes.push(tempId, item.name, null)
        id += 1
        length.push('1')

        item.children.forEach((iten, indey) => {
          nodes.push(id, iten.name, tempId)
          id += 1
          length.push('1')
        })
      })

      const placeholders = length.map(() => '(?, ?, ?)').join(', ');
      const insertStatement = `
        INSERT INTO category (id, name, parent_id) VALUES ${placeholders}
      `
      const insertResult = await conn.execute(insertStatement, nodes)

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

  async getCategory(params) {
    const statement = `SELECT * from category`

    const result = await connection.execute(statement, [])

    let treeData = []
    for (const item of result[0]) {
      if (!item.parent_id) {
        treeData.push({
          ...item,
          children: []
        })
      } else {
        let parent = treeData.find(el => el.id === item.parent_id)
        parent.children.push(item)
      }
    }

    return treeData
  }
}

module.exports = new AboutUsService()