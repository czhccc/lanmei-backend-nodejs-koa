const mysql = require('mysql2');

// 读取 JSON 数据
const jsonData = require('./regionData.js'); // 确保文件格式正确

async function insertRegions() {
  const connection = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '123456',
    database: 'lanmei',
    port: '3306',
  });

  try {
    for (const province of jsonData.theData) {
      // 添加日志输出省的信息
      console.log('插入省份:', province.code, province.name);
      try {
        await connection.execute(
          'INSERT INTO ship_areas (code, name, level) VALUES (?, ?, ?)',
          [province.code, province.name, 'province']
        );
        console.log('省份插入成功:', province.code);
      } catch (error) {
        console.error('插入省份失败:', province.code, error.message);
        continue; // 跳过当前省份的子节点处理
      }

      if (province.children?.length) {
        const cityPromises = province.children.map(async (city) => {
          // 添加日志输出市的信息
          console.log('插入市:', city.code, city.name);
          try {
            await connection.execute(
              'INSERT INTO ship_areas (code, name, level, parent_code) VALUES (?, ?, ?, ?)',
              [city.code, city.name, 'city', province.code]
            );
            console.log('市插入成功:', city.code);
          } catch (error) {
            console.error('插入市失败:', city.code, error.message);
            return; // 跳过当前市的子节点处理
          }

          if (city.children?.length) {
            const districtPromises = city.children.map(async (district) => {
              console.log('插入区:', district.code, district.name);
              try {
                await connection.execute(
                  'INSERT INTO ship_areas (code, name, level, parent_code) VALUES (?, ?, ?, ?)',
                  [district.code, district.name, 'district', city.code]
                );
                console.log('区插入成功:', district.code);
              } catch (error) {
                console.error('插入区失败:', district.code, error.message);
                return; // 跳过当前市的子节点处理
              }
            });
            await Promise.all(districtPromises);
          }
        });
        await Promise.all(cityPromises);
      }
    }
    console.log('数据插入完成');
  } catch (error) {
    console.error('插入数据时发生错误:', error.message);
  }
}


insertRegions();
