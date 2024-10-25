const fs = require('fs');
const path = require('path');

// 定时任务
const cron = require('node-cron');
const connection = require('./database')

const clearUselessFiles = async () => {
  console.log('执行定时任务');

  // 清理 aboutUs 文件夹
  let getAboutUsFilesStatement = `SELECT * FROM about_us_images`;
  const getAboutUsFilesResult = await connection.execute(getAboutUsFilesStatement, []);
  const aboutUsFiles = getAboutUsFilesResult[0].map(item => item.url.split('/')[1])
  console.log('aboutUsFiles', aboutUsFiles);
  let aboutUsFolderPath = path.join(__dirname, '..', '..', 'files', 'aboutUs');
  fs.readdir(aboutUsFolderPath, (err, files) => {
    if (err) {
      throw new Error('读取aboutUs文件目录失败')
    }
    
    files.forEach(file => {
      let keep = false
      aboutUsFiles.forEach(filename => {
        if (file === filename) {
          keep = true
        }
      })
      if (!keep) {
        const filePath = path.join(aboutUsFolderPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            throw new Error('删除aboutUs文件失败')
          }
        })
      }
    });

    console.log('aboutUs文件清理完成')
  })


  // 清理 goods_richText 文件夹
  let getGoodsRichTextFilesStatement = `SELECT * FROM goods_media WHERE useType='richText'`;
  const getGoodsRichTextFilesResult = await connection.execute(getGoodsRichTextFilesStatement, []);
  const goodsRichTextFiles = getGoodsRichTextFilesResult[0].map(item => item.url.split('/')[1])
  let goodsRichTextFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_richText');
  fs.readdir(goodsRichTextFolderPath, (err, files) => {
    if (err) {
      throw new Error('读取goodsRichText文件目录失败')
    }
    
    files.forEach(file => {
      let keep = false
      goodsRichTextFiles.forEach(filename => {
        if (file === filename) {
          keep = true
        }
      })
      if (!keep) {
        const filePath = path.join(goodsRichTextFolderPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            throw new Error('删除goodsRichText文件失败')
          }
        })
      }
    });

    console.log('goodsRichText文件清理完成')
  })


  // 清理 goods_richText 文件夹
  let getGoodsSwiperFilesStatement = `SELECT * FROM goods_media WHERE useType='swiper'`;
  const getGoodsSwiperFilesResult = await connection.execute(getGoodsSwiperFilesStatement, []);
  const goodsSwiperFiles = getGoodsSwiperFilesResult[0].map(item => item.url.split('/')[1])
  let goodsSwiperFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_swiper');
  fs.readdir(goodsSwiperFolderPath, (err, files) => {
    if (err) {
      throw new Error('读取goodsSwiper文件目录失败')
    }
    
    files.forEach(file => {
      let keep = false
      goodsSwiperFiles.forEach(filename => {
        if (file === filename) {
          keep = true
        }
      })
      if (!keep) {
        const filePath = path.join(goodsSwiperFolderPath, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            throw new Error('删除goodsSwiper文件失败')
          }
        })
      }
    });

    console.log('goodsSwiper文件清理完成')
  })


  // 清理 tempFiles文件夹
  let tempFilesFolderPath = path.join(__dirname, '..', '..', 'files', 'tempFiles');
  fs.readdir(tempFilesFolderPath, (err, files) => {
    if (err) {
      throw new Error('读取tempFiles文件目录失败')
    }
    
    files.forEach(file => {
      const filePath = path.join(tempFilesFolderPath, file);
      fs.unlink(filePath, (err) => {
        if (err) {
          throw new Error('删除tempFiles文件失败')
        }
      })
    });

    console.log('tempFiles文件清理完成')
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

// cron.schedule('30 10 26 * *', () => {
  // clearUselessFiles()
// });

// setTimeout(() => {
//   clearUselessFiles()
// }, 4000)








// TODO
// 定时清理tempFiles下的文件