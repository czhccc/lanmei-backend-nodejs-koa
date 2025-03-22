const connection = require('../app/database')

class CategoryService {
  /**
   * 更新分类树数据
   * 1. 使用事务保证数据一致性
   * 2. 先清空表再重新插入（保留原ID序列）
   * 3. 递归处理树形结构生成扁平化插入数据
   * 4. 使用批量插入提升性能
   */
  async updateCategory(params) {
    const conn = await connection.getConnection();
    try {
      await conn.beginTransaction();

      // 清空表数据并重置自增ID（如果支持事务，推荐DELETE）
      await conn.execute('DELETE FROM category');
      await conn.execute('ALTER TABLE category AUTO_INCREMENT = 1');

      // 准备插入数据数组和ID映射表
      const insertData = [];
      let currentId = 1;
      const idMap = new Map(); // 临时ID到数据库ID的映射
      const nameSet = new Set(); // 存储已出现的名称，用于重复检测

      /**
       * 使用栈结构迭代处理树节点，避免递归深度限制
       * @param {Array} rootNodes 根节点数组
       */
      const processTree = (rootNodes) => {
        const stack = [];
        // 反向压栈保证原始顺序（栈先进后出）
        rootNodes.reverse().forEach(root => {
            stack.push({ node: root, parentId: null });
        });

        while (stack.length > 0) {
          const { node, parentId } = stack.pop();
          const dbId = currentId++;

          // 检测名称是否重复
          if (nameSet.has(node.name)) {
            throw new Error(`分类名称重复：${node.name}`);
          }
          nameSet.add(node.name);

          // 存储ID映射关系
          idMap.set(node.tempId, dbId);
          insertData.push([dbId, node.name, parentId]);

          // 处理子节点（反向压栈保证原始顺序）
          if (node.children && node.children.length) {
            node.children.reverse().forEach(child => {
              stack.push({ node: child, parentId: dbId });
            });
          }
        }
      };

      // 处理传入的树形数据
      processTree(params.treeData);

      // 批量插入数据（分批次防止超出数据包限制）
      if (insertData.length > 0) {
        const statement = `INSERT INTO category (id, name, parent_id) VALUES ?`;
        const batchSize = 1000; // 每批插入1000条

        for (let i = 0; i < insertData.length; i += batchSize) {
          const batch = insertData.slice(i, i + batchSize);
          await conn.query(statement, [batch]);
        }
      }

      await conn.commit();
      return { success: true, updatedCount: insertData.length };
    } catch (error) {
      await conn.rollback();
      throw error
    } finally {
      conn.release(); // 释放连接回连接池
    }
  }

  /**
   * 获取分类树结构（带商品数量统计）
   * 1. 使用左连接统计商品数量
   * 2. 单次查询构建树形结构
   * 3. 支持过滤无商品分类
   */
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
            .filter(node => 
              node.goodsCount > 0 ||  // 当前节点有商品
              node.children.length > 0 // 或存在有效子节点
            );
        };
        
        return filterEmptyNodes(treeData);
      }

      return treeData;
    } catch (error) {
      console.error('获取分类失败:', error);
      throw new Error(`获取分类失败: ${error.message}`);
    }
  }
}

module.exports = new CategoryService();