const crypto = require('crypto')

const encryptPasswordUtil = password => {
  const md5 = crypto.createHash('md5')
  const md5Password = md5.update(password).digest('hex') // 'hex'表示转为十六进制，否则是buffer
  return md5Password
}

module.exports = encryptPasswordUtil