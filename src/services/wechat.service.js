const dayjs = require('dayjs')

const connection = require('../app/database');

class WechatService {

  // 用户收货地址
  async addAddress(params) {
    const { name, phone, create_by, provinceCode, cityCode, districtCode, detail, isDefault } = params

    if (!name) {
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      if (isDefault) {
        const updateResult = await conn.execute(`
          UPDATE customer_address SET isDefault = 0 WHERE create_by = ? AND isDefault = 1 LIMIT 1
        `, [create_by])
      }

      const [areas] = await conn.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          provinceCode, cityCode, districtCode,
          provinceCode, cityCode, districtCode
        ]
      );
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;

      // 层级验证
      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');

      const insertResult = await conn.execute(`
        INSERT 
          customer_address (name, phone, create_by, province, provinceCode, city, cityCode, district, districtCode, detail, isDefault) 
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
      `, [name, phone, create_by, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault?1:0 ])

      await conn.commit();
      
      return '新增成功'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }
  async editAddress(params) {
    const { id, name, phone, provinceCode, cityCode, districtCode, detail, isDefault } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }
    if (!name) {
      throw new Error('缺少参数：name')
    }
    if (!phone) {
      throw new Error('缺少参数：phone')
    }
    if (!provinceCode) {
      throw new Error('缺少参数：provinceCode')
    }
    if (!cityCode) {
      throw new Error('缺少参数：cityCode')
    }
    if (!districtCode) {
      throw new Error('缺少参数：districtCode')
    }
    if (!detail) {
      throw new Error('缺少参数：detail')
    }

    try {
      const [addressExistResult] = await connection.execute(
        `SELECT id FROM customer_address WHERE id = ? LIMIT 1`
        [id]
      );
      if (addressExistResult.length === 0) {
        throw new Error('收获地址不存在')
      }

      const [areas] = await connection.execute(
        `SELECT *
          FROM ship_areas 
          WHERE code IN (?, ?, ?) 
          ORDER BY FIELD(code, ?, ?, ?)`, // 确保顺序：省→市→区
        [
          provinceCode, cityCode, districtCode,
          provinceCode, cityCode, districtCode
        ]
      );
      if (areas.length !== 3) throw new Error('地址信息不完整');
      const [province, city, district] = areas;
  
      // 层级验证
      if (province.level !== 'province') throw new Error('所选省份不存在数据库中');
      if (city.parent_code !== province.code) throw new Error('所选市不属于所选省');
      if (district.parent_code !== city.code) throw new Error('所选区不属于所选市');
  
      const updateResult = await connection.execute(`
        UPDATE customer_address 
        SET name=?, phone=?, province=?, provinceCode=?, city=?, cityCode=?, district=?, districtCode=?, detail=?, isDefault=?
        WHERE id = ?
      `, [
        name, phone, province.name, provinceCode, city.name, cityCode, district.name, districtCode, detail, isDefault, id
      ])
  
      return 'success'
    } catch (error) {
      throw error
    }
  }
  async getAddressList(params) {
    const { create_by } = params

    if (!create_by) {
      throw new Error('缺少参数：create_by')
    }

    try {
      const [result] = await connection.execute(
        `SELECT * from customer_address WHERE create_by=?`, 
        [create_by]
      )
  
      return result
    } catch (error) {
      throw error
    }
  }
  async deleteAddress(params) {
    const { id } = params

    if (!id) {
      throw new Error('缺少参数：id')
    }

    try {
      const result = await connection.execute(
        `DELETE FROM customer_address WHERE id = ?`, 
        [id]
      );
  
      if (result.affectedRows === 0) {
        const [infoResult] = await connection.execute(
          `SELECT * FROM customer_address WHERE id = ?`, 
          [id]
        );
        if (infoResult.length === 0) {
          throw new Error('该收货地址不存在')
        }
  
        throw new Error('删除失败');
      }
  
      return '删除成功'
    } catch (error) {
      throw error
    }
  }
  async getDefaultAddress(params) {
    const { create_by } = params

    if (!create_by) {
      throw new Error('缺少参数：create_by')
    }

    try {
      const result = await connection.execute(
        `SELECT * from customer_address WHERE create_by=? AND isDefault=1`, 
        [create_by]
      )
  
      return result[0]
    } catch (error) {
      throw error
    }
  }


  // 用户首页通知
  async notify(params) {
    const { content, thePhone } = params

    if (!content) {
      throw new Error('缺少参数：content')
    }

    try {
      const insertResult = await connection.execute(
        `INSERT wechat_home_notify (content, createBy) VALUES (?,?)`, 
        [content, thePhone]
      )
      return insertResult
    } catch (error) {
      throw error
    }
  }
  async getNotificationList(params) {
    const { pageNo, pageSize } = params;
  
    try {
      const [totalResult] = await connection.execute(
        `SELECT COUNT(*) as total FROM wechat_home_notify`, 
        []
      );
    
      const pageSizeInt = Number.parseInt(pageSize, 10) || 10;
      const offset = (Number.parseInt(pageNo, 10) - 1) * pageSizeInt || 0;
    
      const result = await connection.execute(`
        SELECT * FROM wechat_home_notify 
        ORDER BY createTime DESC 
        LIMIT ? OFFSET ?
      `, [String(pageSizeInt), String(offset)]);
    
      return {
        total: totalResult[0].total,
        records: result[0],
      };
    } catch (error) {
      throw error
    }
  }
  async getLatestNotification() {
    const [result] = await connection.execute(`SELECT * FROM wechat_home_notify ORDER BY createTime DESC LIMIT 1`);
    
    if (result.length === 0) {
      return '无最近通知'
    } else {
      let record = result[0]
      record.createTime = dayjs(record.createTime).format('YYYY-MM-DD HH:mm')
      return record;
    }
  }
  
}

module.exports = new WechatService()