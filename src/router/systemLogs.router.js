const Router = require('koa-router')

const SystemLogsController = require('../controllers/systemLogs.controller')

const tableResponseHandler = require('../middlewares/table-response-handler');

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const checkOlynCzhCall = require('../middlewares/checkOnlyCzhCall.middleware')

const systemLogsRouter = new Router({prefix: '/systemLogs'})

systemLogsRouter.get('/list', verifyToken, checkOlynCzhCall, tableResponseHandler, SystemLogsController.getSystemLogsList)

systemLogsRouter.post('/deleteSystemLogs', verifyToken, checkOlynCzhCall, SystemLogsController.deleteSystemLogs)

systemLogsRouter.post('/deleteSystemLogsByTime', verifyToken, checkOlynCzhCall, SystemLogsController.deleteSystemLogsByTime)
 
module.exports = systemLogsRouter