const connection = require('../app/database')

const redisUtils = require('../utils/redisUtils')

class CategoryService {

  async updateCategory(params) {
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute('DELETE FROM category');

      if (params.treeData.length > 0) {
        const insertData = [];
        let currentId = 1;
        const idMap = new Map(); // 临时ID到数据库ID的映射
        const nameSet = new Set(); // 存储已出现的名称，用于重复检测

        const processTree = (rootNodes) => {
          const stack = [];
          rootNodes.reverse().forEach(root => {
            stack.push({ node: root, parentId: null });
          });

          while (stack.length > 0) {
            const { node, parentId } = stack.pop();
            const dbId = currentId++;

            if (nameSet.has(node.name)) {
              throw new Error(`分类名称重复：${node.name}`);
            }
            nameSet.add(node.name);

            idMap.set(node.tempId, dbId);
            insertData.push([dbId, node.name, parentId]);

            if (node.children && node.children.length) {
              node.children.reverse().forEach(child => {
                stack.push({ node: child, parentId: dbId });
              });
            }
          }
        };

        processTree(params.treeData);

        await conn.execute(`INSERT INTO category (id, name, parent_id) VALUES ${insertData.map(() => '(?,?,?)').join(',')}`, insertData.flat())
      }

      await redisUtils.del('categoryList:forWechat');

      await conn.commit();

      return 'success'
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      if (conn) conn.release();
    }
  }

  async getCategory(params) {
    try {
      // 动态构建SQL查询语句（使用参数化查询防止SQL注入）
      const statement = `
        SELECT 
          c.id,
          c.name,
          c.parent_id,
          IFNULL(g.goods_count, 0) AS goodsCount
        FROM category c
        LEFT JOIN (
          SELECT goods_categoryId, COUNT(id) AS goods_count 
          FROM goods 
          ${params.isSelling ? 'WHERE goods_isSelling = 1' : ''}
          GROUP BY goods_categoryId
        ) g ON c.id = g.goods_categoryId
        ORDER BY c.parent_id ASC, c.id ASC
      `;

      const [rows] = await connection.execute(statement);
      
      // 使用Map存储所有节点，O(n)时间复杂度构建树
      const nodeMap = new Map();
      const treeData = [];

      // 第一遍：创建所有节点并存储父子关系
      rows.forEach(row => {
        const node = {
          id: row.id,
          name: row.name,
          goodsCount: row.goodsCount,
          children: []
        };
        nodeMap.set(row.id, node);
        
        // 根节点直接加入树结构
        if (!row.parent_id) {
          treeData.push(node);
        }
      });

      // 第二遍：建立父子层级关系
      rows.forEach(row => {
        if (row.parent_id) {
          const parent = nodeMap.get(row.parent_id);
          parent?.children.push(nodeMap.get(row.id));
        }
      });

      /**
       * 过滤空分类（当需要过滤在售商品时）
       * 采用后序遍历过滤，确保父节点能正确处理子节点状态
       */
      if (params.isSelling) {
        const filterEmptyNodes = (nodes) => {
          return nodes
            .map(node => ({
              ...node,
              children: filterEmptyNodes(node.children)
            }))
            .filter(node => node.goodsCount > 0 || node.children.length > 0);
        };
        
        return filterEmptyNodes(treeData);
      }

      return treeData;
    } catch (error) {
      console.error('获取分类失败:', error);
      throw new Error(`获取分类失败: ${error.message}`);
    }
  }

  async getCategoryForWechat(params) {
    try {

      const redisData = await redisUtils.get('categoryList:forWechat');
      if (redisData) {
        return redisData;
      }

      const statement = `
        SELECT 
          c.id,
          c.name,
          c.parent_id,
          IFNULL(g.goods_count, 0) AS goodsCount
        FROM category c
        LEFT JOIN (
          SELECT goods_categoryId, COUNT(id) AS goods_count 
          FROM goods 
          WHERE goods_isSelling = 1
          GROUP BY goods_categoryId
        ) g ON c.id = g.goods_categoryId
        ORDER BY c.parent_id ASC, c.id ASC
      `;

      const [rows] = await connection.execute(statement);
      
      // 使用Map存储所有节点，O(n)时间复杂度构建树
      const nodeMap = new Map();
      const treeData = [];

      // 第一遍：创建所有节点并存储父子关系
      rows.forEach(row => {
        const node = {
          id: row.id,
          name: row.name,
          goodsCount: row.goodsCount,
          children: []
        };
        nodeMap.set(row.id, node);
        
        // 根节点直接加入树结构
        if (!row.parent_id) {
          treeData.push(node);
        }
      });

      // 第二遍：建立父子层级关系
      rows.forEach(row => {
        if (row.parent_id) {
          const parent = nodeMap.get(row.parent_id);
          parent?.children.push(nodeMap.get(row.id));
        }
      });

      const filterEmptyNodes = (nodes) => {
        return nodes
          .map(node => ({
            ...node,
            children: filterEmptyNodes(node.children)
          }))
          .filter(node => node.goodsCount > 0 || node.children.length > 0);
      };
      
      let theData = filterEmptyNodes(treeData)
      
      await redisUtils.set('categoryList:forWechat', theData);

      return theData

    } catch (error) {
      console.error('获取分类失败:', error);
      throw new Error(`获取分类失败: ${error.message}`);
    }
  }
}

module.exports = new CategoryService();