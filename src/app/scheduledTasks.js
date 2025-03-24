const fs = require('fs');
const path = require('path');

// 定时任务
const cron = require('node-cron');
const connection = require('./database')

const getFilesFromDatabase = async (query) => {
  const [rows] = await connection.execute(query, []);
  return rows.map(item => item.url.split('/')[1]);
};

const clearFolder = async (folderPath, dbFiles) => {
  try {
    const files = await fs.promises.readdir(folderPath);
    const filesToDelete = files.filter(file => !dbFiles.includes(file));

    await Promise.all(filesToDelete.map(file => {
      const filePath = path.join(folderPath, file);
      return fs.promises.unlink(filePath).catch(err => {
        console.error(`删除文件失败: ${filePath}`, err);
      });
    }));

    console.log(`${path.basename(folderPath)} 文件夹清理完成`);
  } catch (err) {
    console.error(`读取 ${folderPath} 文件目录失败`, err);
  }
};

const clearUselessFiles = async () => {
  console.log('执行定时任务');

  // 清理 aboutUs 文件夹
  const aboutUsFiles = await getFilesFromDatabase(`SELECT url FROM about_us_images`);
  const aboutUsFolderPath = path.join(__dirname, '..', '..', 'files', 'aboutUs');
  await clearFolder(aboutUsFolderPath, aboutUsFiles);

  // 清理 goods_richText 文件夹
  const goodsRichTextFiles = await getFilesFromDatabase(`SELECT url FROM goods_media WHERE useType='richText'`);
  const goodsRichTextFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_richText');
  await clearFolder(goodsRichTextFolderPath, goodsRichTextFiles);

  // 清理 goods_swiper 文件夹
  const goodsSwiperFiles = await getFilesFromDatabase(`SELECT url FROM goods_media WHERE useType='swiper'`);
  const goodsSwiperFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_swiper');
  await clearFolder(goodsSwiperFolderPath, goodsSwiperFiles);

  // 清理 tempFiles 文件夹
  const tempFilesFolderPath = path.join(__dirname, '..', '..', 'files', 'tempFiles');
  await clearFolder(tempFilesFolderPath, []);
};

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
