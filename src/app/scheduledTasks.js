const fs = require('fs');
const path = require('path');

// 定时任务
const cron = require('node-cron');
const connection = require('./database')

const clearUselessFiles = async () => {
  console.log('执行定时任务');

  let queryOtherFileStatement = `SELECT * FROM other_file`;
  const queryOtherFileResult = await connection.execute(queryOtherFileStatement, []);
  const otherFileName = queryOtherFileResult[0].map(item => path.basename(new URL(item.url).pathname))

  let queryGoodsFileStatement = `SELECT * FROM goods_media`;
  const queryGoodsFileResult = await connection.execute(queryGoodsFileStatement, []);
  const goodsFileName = queryGoodsFileResult[0].map(item => path.basename(new URL(item.url).pathname))

  let allFileName = [...otherFileName, ...goodsFileName]
  console.log('allFileName', allFileName);

  
  let filesFolderPath = path.join(__dirname, '..', '..', 'files');
  fs.readdir(filesFolderPath, (err, files) => {
    if (err) {
      throw new Error('读取文件目录失败')
    }
    
    files.forEach(file => {
      // console.log('file', file)
      let keep = false
      allFileName.forEach(filename => {
        if (file === filename) {
          keep = true
        }
      })
      if (!keep) {
        const filePath = path.join(filesFolderPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            throw new Error('删除文件失败')
          }
        })
      }
    });

    console.log('文件清理完成')
  })
}

// 执行定时任务

// 0 0 * * 0
// | | | | |
// | | | | └── 星期几 (0 = 星期天, 1 = 星期一, ..., 6 = 星期六)
// | | | └──── 月份中的哪一天 (1-31)
// | | └────── 月份 (1-12)
// | └──────── 小时 (0-23)
// └────────── 分钟 (0-59)

cron.schedule('30 10 26 * *', () => {
  // clearUselessFiles()
});

// setTimeout(() => {
//   clearUselessFiles()
// }, 2000)








// TODO
// 定时清理tempFiles下的文件