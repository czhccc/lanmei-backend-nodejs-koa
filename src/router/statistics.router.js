const Router = require('koa-router')

const StatisticsController = require('../controllers/statistics.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const tableResponseHandler = require('../middlewares/table-response-handler');

const statisticsRouter = new Router({prefix: '/statistics'})

statisticsRouter.get('/getSingleBatchStatistics', verifyToken, StatisticsController.getSingleBatchStatistics)


module.exports = statisticsRouter