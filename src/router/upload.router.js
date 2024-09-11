const Router = require('koa-router')
const Multer = require('koa-multer')
const path = require('path')

const UploadController = require('../controllers/upload.controller')

const {
  verifyToken
} = require('../middlewares/auth.middleware')

// const {
//   fileHandle
// } = require('../middlewares/upload.middleware')


const storage = Multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './files')
  },
  filename: (req, file, cb) => {
    // 获取原文件的扩展名
    const extname = path.extname(file.originalname)
    // 自定义保存的文件名，可以使用时间戳加文件原名或其他方式生成唯一文件名
    cb(null, `${Date.now()}${extname}`)
  }
})

const fileUpload = Multer({ storage })

// const fileUpload = Multer({
//   dest: './files'
// })

const fileHandle = fileUpload.single('file')

const uploadRouter = new Router({prefix: '/upload'})
uploadRouter.post('/', verifyToken, fileHandle)
// uploadRouter.get('/', UploadController.test)

module.exports = uploadRouter