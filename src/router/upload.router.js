const Router = require('koa-router')

const UploadController = require('../controllers/upload.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

const {
  fileHandle,
  classifyUploadedFile,
} = require('../middlewares/upload.middleware')

const uploadRouter = new Router({prefix: '/upload'})

uploadRouter.get('/getCOSTemporaryKey', verifyToken, UploadController.getCOSTemporaryKey)

module.exports = uploadRouter