function genarateDatetimeId() {
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
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  // 生成随机字符串函数
  function generateRandomString(length) {
    return Math.random().toString(36).substr(2, length); // 随机生成一串字符
  }

  const formattedDate = formatDate();  // 格式化后的日期
  const randomString = generateRandomString(6);  // 生成6位随机字符

  return `${formattedDate}_${randomString}`
}

module.exports = genarateDatetimeId