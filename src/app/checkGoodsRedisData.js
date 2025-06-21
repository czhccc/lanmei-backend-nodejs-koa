const connection = require('./database'); // 根据实际路径调整
const redisUtils = require('../utils/redisUtils'); // 根据实际路径调整
const logger = require('../utils/logger'); // 根据实际路径调整

async function checkGoodsRedisData() {
  try {
    console.log('checkGoodsRedisData');
    
    const [goods] = await connection.execute(`
      SELECT id, batch_no, batch_type, batch_stock_totalQuantity, batch_preorder_finalPrice FROM goods WHERE goods_isSelling = '1'
    `);

    for (const good of goods) {
      const { id, batch_no, batch_type, batch_stock_totalQuantity, batch_preorder_finalPrice } = good;
      
      try {
        if (batch_type === 'preorder') {
          if (!batch_preorder_finalPrice) {
            const [pendingRes] = await connection.execute(`
              SELECT
                COUNT(CASE WHEN status = 'reserved' THEN 1 END) AS reservedOrdersCount,
                SUM(CASE WHEN status = 'reserved' THEN quantity ELSE 0 END) AS reservedQuantity
              FROM orders
              WHERE batch_no = ?
            `, [batch_no]);

            const pendingData = pendingRes[0] || {};
            const dbReservedOrders = Number(pendingData.reservedOrdersCount || 0);
            const dbReservedQuantity = Number(pendingData.reservedQuantity || 0);

            const [redisReservedOrders, redisReservedQuantity] = await Promise.all([
              redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`),
              redisUtils.getWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`)
            ]);

            if (dbReservedOrders !== Number(redisReservedOrders) || dbReservedQuantity !== Number(redisReservedQuantity)) {
              logger.warn(`checkGoodsRedisData`, `goodsId:${id} preorder pending 数据不一致`, {
                db: { dbReservedOrders, dbReservedQuantity },
                redis: { redisReservedOrders, redisReservedQuantity }
              });

              await Promise.all([
                redisUtils.deleteKey(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`),
                redisUtils.deleteKey(`goodsSelling:${id}:preorder_pending:reservedQuantity`)
              ]);

              await Promise.all([
                redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:reservedOrdersCount`, dbReservedOrders),
                redisUtils.setWithVersion(`goodsSelling:${id}:preorder_pending:reservedQuantity`, dbReservedQuantity)
              ]);
            }
          } else if (batch_preorder_finalPrice) {
            const [sellingRes] = await connection.execute(`
              SELECT
                SUM(CASE WHEN status IN ('completed', 'closed', 'refunded') THEN quantity ELSE 0 END) AS finishedQuantity,
                COUNT(CASE WHEN status IN ('completed', 'closed', 'refunded') THEN 1 END) AS finishedOrdersCount
              FROM orders
              WHERE batch_no = ?
            `, [batch_no]);

            const sellingData = sellingRes[0] || {};
            const dbFinishedQuantity = Number(sellingData.finishedQuantity || 0);
            const dbFinishedOrders = Number(sellingData.finishedOrdersCount || 0);

            const [redisFinishedQuantity, redisFinishedOrders] = await Promise.all([
              redisUtils.getWithVersion(`goodsSelling:${id}:preorder_selling:finishedQuantity`),
              redisUtils.getWithVersion(`goodsSelling:${id}:preorder_selling:finishedOrdersCount`)
            ]);

            if (dbFinishedQuantity !== Number(redisFinishedQuantity) || dbFinishedOrders !== Number(redisFinishedOrders)) {
              logger.warn(`checkGoodsRedisData`, `goodsId:${id} preorder selling 数据不一致`, {
                db: { dbFinishedQuantity, dbFinishedOrders },
                redis: { redisFinishedQuantity, redisFinishedOrders }
              });

              await Promise.all([
                redisUtils.deleteKey(`goodsSelling:${id}:preorder_selling:finishedQuantity`),
                redisUtils.deleteKey(`goodsSelling:${id}:preorder_selling:finishedOrdersCount`)
              ]);

              await Promise.all([
                redisUtils.setWithVersion(`goodsSelling:${id}:preorder_selling:finishedQuantity`, dbFinishedQuantity),
                redisUtils.setWithVersion(`goodsSelling:${id}:preorder_selling:finishedOrdersCount`, dbFinishedOrders)
              ]);
            }
          }
        } else if (batch_type === 'stock') {
          const [stockRes] = await connection.execute(`
            SELECT
              SUM(CASE WHEN status IN ('paid', 'shipped', 'completed', 'refunded') THEN quantity ELSE 0 END) AS consumedQuantity,
              COUNT(CASE WHEN status IN ('paid', 'shipped', 'completed', 'refunded') THEN 1 END) AS totalOrdersCount,
              SUM(CASE WHEN status IN ('completed', 'refunded') THEN quantity ELSE 0 END) AS finishedQuantity,
              COUNT(CASE WHEN status IN ('completed', 'refunded') THEN 1 END) AS finishedOrdersCount
            FROM orders
            WHERE batch_no = ?
          `, [batch_no]);

          const stockData = stockRes[0] || {};
          const dbConsumedQuantity = Number(stockData.consumedQuantity || 0);
          const dbRemainingQuantity = Number(batch_stock_totalQuantity) - dbConsumedQuantity;
          const dbTotalOrders = Number(stockData.totalOrdersCount || 0);
          const dbFinishedQuantity = Number(stockData.finishedQuantity || 0);
          const dbFinishedOrders = Number(stockData.finishedOrdersCount || 0);

          // 获取Redis数据
          const [redisRemainingQuantity, redisTotalOrders, redisFinishedQuantity, redisFinishedOrders] = await Promise.all([
            redisUtils.getWithVersion(`goodsSelling:${id}:stock:remainingQuantity`),
            redisUtils.getWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`),
            redisUtils.getWithVersion(`goodsSelling:${id}:stock:finishedQuantity`),
            redisUtils.getWithVersion(`goodsSelling:${id}:stock:finishedOrdersCount`)
          ]);

          // 比较所有字段
          if (dbRemainingQuantity !== Number(redisRemainingQuantity) ||
              dbTotalOrders !== Number(redisTotalOrders) ||
              dbFinishedQuantity !== Number(redisFinishedQuantity) ||
              dbFinishedOrders !== Number(redisFinishedOrders)
            ) {

            logger.warn(`checkGoodsRedisData`, `goodsId:${id} stock selling 数据不一致`, {
              db: {
                remaining: dbRemainingQuantity,
                totalOrders: dbTotalOrders,
                finishedQuantity: dbFinishedQuantity,
                finishedOrders: dbFinishedOrders
              },
              redis: {
                remaining: redisRemainingQuantity,
                totalOrders: redisTotalOrders,
                finishedQuantity: redisFinishedQuantity,
                finishedOrders: redisFinishedOrders
              }
            });

            await Promise.all([
              redisUtils.deleteKey(`goodsSelling:${id}:stock:remainingQuantity`),
              redisUtils.deleteKey(`goodsSelling:${id}:stock:totalOrdersCount`),
              redisUtils.deleteKey(`goodsSelling:${id}:stock:finishedQuantity`),
              redisUtils.deleteKey(`goodsSelling:${id}:stock:finishedOrdersCount`)
            ]);

            await Promise.all([
              redisUtils.setWithVersion(`goodsSelling:${id}:stock:remainingQuantity`, dbRemainingQuantity),
              redisUtils.setWithVersion(`goodsSelling:${id}:stock:totalOrdersCount`, dbTotalOrders),
              redisUtils.setWithVersion(`goodsSelling:${id}:stock:finishedQuantity`, dbFinishedQuantity),
              redisUtils.setWithVersion(`goodsSelling:${id}:stock:finishedOrdersCount`, dbFinishedOrders)
            ]);
          }
        }
      } catch (error) {
        logger.error(`checkGoodsRedisData`, `goodsId:${id} 数据处理失败`, {
          id,
          batch_no,
          error
        });
      }
    }
  } catch (error) {
    logger.error('checkGoodsRedisData 整体执行失败', error);
  }
}

module.exports = checkGoodsRedisData;