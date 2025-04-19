const fs = require('fs')
const path = require('path')

const Multer = require('koa-multer')

const logger = require('../utils/logger')

const storage = Multer.diskStorage({
  destination: (req, file, cb) => {
    let dir = path.join(__dirname, '..', '..', 'files/tempFiles');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const extname = path.extname(file.originalname);  // 获取文件扩展名

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const formattedDate = `${year}${month}${day}${hours}${minutes}${seconds}`;  // 格式化后的日期

    const randomString = Math.random().toString(36).substr(2, 6);  // 生成6位随机字符
    const filename = `${formattedDate}_${randomString}${extname}`;  // 拼接文件名

    req.myFilename = filename

    cb(null, filename);  // 设置文件名
  }
})

// fileUpload 是一个配置好的 Multer 实例，用于处理文件上传。它定义了存储方式和其他配置选项，但并不会直接处理请求。
const fileUpload = Multer({ storage }) 

const fileHandle = fileUpload.single('file')

const classifyUploadedFile = async (ctx, next) => {
  let theType = ctx.req.body.flag.split('-')[0];
  let theTypeValue = ctx.req.body.flag.split('-')[1];

  // 构造旧的文件路径
  let oldFilename = ctx.req.myFilename;
  let oldPath = path.join(__dirname, '..', '..', `files/tempFIles`, oldFilename);

  // 根据文件类型设置新的存放路径和文件名
  let newFilename = theTypeValue ? `${theType}-${theTypeValue}_${oldFilename}` : `${theType}_${oldFilename}`;
  let newDir = path.join(__dirname, '..', '..', `files/${theType}`);

  // 如果目标文件夹不存在，则创建
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  // 新的文件路径
  let newPath = path.join(newDir, newFilename);

  // 重命名并移动文件
  await new Promise((resolve, reject) => {
    fs.rename(oldPath, newPath, (error) => {
      if (error) {
        logger.error('upload', '重命名并移动文件失败', { error, oldPath, newPath, });
         // 删除临时文件
        return reject(new Error('文件重命名或移动失败'));
      }
      resolve();
    });
  });

  // 设置响应，在重命名和移动成功后返回文件信息
  ctx.body = {
    fileKey: `${theType}/${newFilename}`,  // 返回文件的新路径
    fileInfo: {
      originalname: ctx.req.file.originalname,
      filename: newFilename,
      destination: newDir,  // 返回新文件夹路径
      size: ctx.req.file.size,
    },
  }

}


module.exports = {
  fileHandle,
  classifyUploadedFile
}