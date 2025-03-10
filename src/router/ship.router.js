const Router = require('koa-router')

const ShipController = require('../controllers/ship.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const shipRouter = new Router({prefix: '/ship'})

shipRouter.get('/getAll', verifyToken, ShipController.getAll)
shipRouter.post('/changeUsable', verifyToken, ShipController.changeUsable)
shipRouter.get('/getShipProvincesOfLastBatch', verifyToken, ShipController.getShipProvincesOfLastBatch)

module.exports = shipRouter