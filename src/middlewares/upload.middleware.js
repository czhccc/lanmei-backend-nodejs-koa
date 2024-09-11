const Multer = require('koa-multer')
const path = require('path')

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

const fileHandle = fileUpload.single('file')

// 自定义响应消息的中间件
const returnUploadResponse = async (ctx, next) => {
  if (!ctx.req.file) {
    ctx.status = 400
    ctx.body = {
      message: 'No file uploaded'
    }
    return
  }

  // 返回上传成功的响应信息
  ctx.body = {
    message: 'File uploaded successfully',
    fileInfo: {
      originalname: ctx.req.file.originalname,
      filename: ctx.req.file.filename,
      path: ctx.req.file.path,
      size: ctx.req.file.size
    }
  }
}


module.exports = {
  fileHandle,
  returnUploadResponse
}