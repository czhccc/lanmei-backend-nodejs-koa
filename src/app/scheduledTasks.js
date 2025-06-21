const fs = require('fs');
const path = require('path');

// 定时任务
const cron = require('node-cron');
const connection = require('./database')

const checkGoodsRedisData = require('./checkGoodsRedisData');

const getUsableFilesNamesFromDatabase = async (query) => {
  const [rows] = await connection.execute(query, []);
  return rows.map(item => item.url.split('/')[1]);
};

const clearUnusableFilesByFileName = async (folderPath, dbFiles) => {
  try {
    const files = await fs.promises.readdir(folderPath);
    const filesToDelete = files.filter(file => !dbFiles.includes(file));

    await Promise.all(filesToDelete.map(file => {
      const filePath = path.join(folderPath, file);
      return fs.promises.unlink(filePath).catch(error => {
        console.error(`删除文件失败: ${filePath}`, error);
      });
    }));

    console.log(`${path.basename(folderPath)} 文件夹清理完成`);
  } catch (error) {
    console.error(`读取 ${folderPath} 文件目录失败`, error);
  }
};

const clearUselessFiles = async () => {
  console.log('执行定时任务');

  // 清理 tempFiles 文件夹
  const tempFilesFolderPath = path.join(__dirname, '..', '..', 'files', 'tempFiles');
  await clearUnusableFilesByFileName(tempFilesFolderPath, []);

  // 清理 aboutUs 文件夹
  const aboutUsFiles = await getUsableFilesNamesFromDatabase(`SELECT url FROM aboutus_images`);
  const aboutUsFolderPath = path.join(__dirname, '..', '..', 'files', 'aboutUs');
  await clearUnusableFilesByFileName(aboutUsFolderPath, aboutUsFiles);

  // 清理 goods_richText 文件夹
  const goodsRichTextFiles = await getUsableFilesNamesFromDatabase(`SELECT url FROM goods_media WHERE useType='richText'`);
  const goodsRichTextFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_richText');
  await clearUnusableFilesByFileName(goodsRichTextFolderPath, goodsRichTextFiles);

  // 清理 goods_swiper 文件夹
  const goodsSwiperFiles = await getUsableFilesNamesFromDatabase(`SELECT url FROM goods_media WHERE useType='swiper'`);
  const goodsSwiperFolderPath = path.join(__dirname, '..', '..', 'files', 'goods_swiper');
  await clearUnusableFilesByFileName(goodsSwiperFolderPath, goodsSwiperFiles);

  // 清理 news 文件夹
  const newsFiles = await getUsableFilesNamesFromDatabase(`SELECT url FROM others_media WHERE useType='news'`);
  const newsFolderPath = path.join(__dirname, '..', '..', 'files', 'news');
  await clearUnusableFilesByFileName(newsFolderPath, newsFiles);

  // 清理 news_richText 文件夹
  const recommendFiles = await getUsableFilesNamesFromDatabase(`SELECT url FROM others_media WHERE useType='recommend'`);
  const recommendFolderPath = path.join(__dirname, '..', '..', 'files', 'news_richText');
  await clearUnusableFilesByFileName(recommendFolderPath, recommendFiles);
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

// 每天凌晨 4 点执行
cron.schedule('0 4 * * *', () => {
  checkGoodsRedisData()
});
