const Multer = require('koa-multer')

const fileUpload = Multer({
  dest: './files'
})

const fileHandle = fileUpload.single('file')

module.exports = {
  fileHandle
}