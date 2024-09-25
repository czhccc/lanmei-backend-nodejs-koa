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
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

// 生成随机字符串函数
function generateRandomString(length) {
  return Math.random().toString(36).substr(2, length); // 随机生成一串字符
}

const storage = Multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, '..', '..', 'files');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);  // 获取文件扩展名
    const formattedDate = formatDate();  // 格式化后的日期
    const randomString = generateRandomString(6);  // 生成6位随机字符
    const filename = `${formattedDate}_${randomString}${extname}`;  // 拼接文件名

    req.myFilename = filename

    cb(null, filename);  // 设置文件名
  }
})

// fileUpload 是一个配置好的 Multer 实例，用于处理文件上传。它定义了存储方式和其他配置选项，但并不会直接处理请求。
const fileUpload = Multer({ storage }) 

const fileHandle = fileUpload.single('file')

// 自定义响应消息的中间件
// const returnUploadResponse = async (ctx, next) => {
//   if (!ctx.req.file) {
//     ctx.status = 400
//     ctx.body = {
//       message: 'No file uploaded'
//     }
//     return
//   }

//   // 返回上传成功的响应信息
  
// }

const renameUploadedFile = async (ctx, next) => {
  let theType = ctx.req.body.flag.split('-')[0]
  let theTypeValue = ctx.req.body.flag.split('-')[1]

  let oldFilename = ctx.req.myFilename
  let newFilename = theTypeValue ? `${theType}-${theTypeValue}_${oldFilename}` : `${theType}_${oldFilename}`

  let oldPath = path.join(__dirname, '..', '..', 'files', oldFilename);
  let newPath = path.join(__dirname, '..', '..', 'files', newFilename);

  // 重命名文件
  await new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        return reject(new Error('文件重命名失败'));
      }
      resolve();
    });
  });

  // 设置 ctx.body 在重命名成功后
  ctx.body = {
    url: `http://localhost:8888/${newFilename}`,
    fileInfo: {
      originalname: ctx.req.file.originalname,
      filename: newFilename,
      destination: ctx.req.file.destination,
      size: ctx.req.file.size,
    },
  }

  // fs.rename(oldPath, newPath, (err) => {
  //   if (err) {
  //     console.log('err', err)
  //     throw new Error('文件重命名失败')
  //   }
  //   console.log('文件重命名成功')
  //   console.log({
  //     url: `http://localhost:8888/${newFilename}`,
  //     fileInfo: {
  //       originalname: ctx.req.file.originalname,
  //       filename: newFilename,
  //       destination: ctx.req.file.destination,
  //       size: ctx.req.file.size
  //     }
  //   })
  //   ctx.body = {
  //     url: `http://localhost:8888/${newFilename}`,
  //     fileInfo: {
  //       originalname: ctx.req.file.originalname,
  //       filename: newFilename,
  //       destination: ctx.req.file.destination,
  //       size: ctx.req.file.size
  //     }
  //   }
  // });

}


module.exports = {
  fileHandle,
  // returnUploadResponse,
  renameUploadedFile
}