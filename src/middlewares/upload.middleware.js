const fs = require('fs')
const path = require('path')

const Multer = require('koa-multer')

// 格式化日期函数
function formatDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  // 返回带有分隔符的日期时间字符串
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// 生成随机字符串函数
function generateRandomString(length) {
  return Math.random().toString(36).substr(2, length); // 随机生成一串字符
}

const storage = Multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('./files')) {
      console.log('没有./files');
      fs.mkdirSync('./files', { recursive: true });
    }
    cb(null, './files')
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);  // 获取文件扩展名
    const formattedDate = formatDate();  // 格式化后的日期
    const randomString = generateRandomString(6);  // 生成6位随机字符
    const filename = `${formattedDate}_${randomString}${extname}`;  // 拼接文件名
    cb(null, filename);  // 设置文件名
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
    url: `http://localhost:8888/${ctx.req.file.filename}`,
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