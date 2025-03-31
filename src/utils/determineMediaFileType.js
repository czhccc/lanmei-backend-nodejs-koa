const path = require('path');

// 预定义扩展名集合（小写）
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg', 'mpg', '3gp']);

/**
 * 根据文件路径判断文件类型（图片/视频/未知）
 * @param {string} filePath - 文件路径（如 `news/news_2025...jpg`）
 * @returns {'image' | 'video' | 'unknown'}
 */
const determineMediaFileType = (filePath) => {
  // 提取扩展名并处理大小写
  // 使用 path.extname() 方法直接获取扩展名（含.前缀），例如 .jpg，然后通过 .slice(1) 去掉点号，得到 jpg。
  const ext = path.extname(filePath).toLowerCase().slice(1); // 去掉开头的点
  
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }
  return 'unknown';
}

module.exports = determineMediaFileType