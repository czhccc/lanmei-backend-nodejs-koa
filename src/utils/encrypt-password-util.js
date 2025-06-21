const bcrypt = require('bcrypt');

const encryptPasswordUtil = (password) => {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
};

// 比较用户输入的密码和数据库存储的哈希密码
const comparePasswordUtil = (inputPassword, storedHashedPassword) => {
  // bcrypt.compareSync 是 bcrypt 模块提供的一个同步方法，用于比较明文密码和加密后的哈希密码是否匹配。它通常用于用户登录验证。
  return bcrypt.compareSync(inputPassword, storedHashedPassword);
};

module.exports = {
  encryptPasswordUtil,
  comparePasswordUtil
}