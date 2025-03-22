const bcrypt = require('bcrypt');

const encryptPasswordUtil = (password) => {
  const saltRounds = 10;
  const hashedPassword = bcrypt.hashSync(password, saltRounds);
  return hashedPassword;
};

// 比较用户输入的密码和数据库存储的哈希密码
const comparePasswordUtil = (inputPassword, storedHashedPassword) => {
  return bcrypt.compareSync(inputPassword, storedHashedPassword);
};

module.exports = {
  encryptPasswordUtil,
  comparePasswordUtil
}