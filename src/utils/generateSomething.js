const dayjs = require('dayjs');

const crypto = require('crypto');

/**
 * 生成商品批次号
 * @returns {string} - 商品批次号
 */
const generateBatchNo = () => {
  const randomString = Math.random().toString(36).substr(2, 6);  // 生成6位随机字符
  return `${dayjs().format('YYYYMMDDHHmmss')}_${randomString}`
}

// ==============================================================================

const getRandomLetters = (length = 2) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};
/**
 * 生成订单号
 * @param {string} phone - 用户手机号
 * @returns {string} - 订单号
 */
const generateOrderNo = (phone) => {
  const now = dayjs().format('YYYYMMDDHHmmss'); // 当前时间（精确到秒）
  const ms = dayjs().millisecond().toString().padStart(3, '0'); // 毫秒（3位）
  const suffix = phone?.slice(-4) || '0000'; // 手机后4位，防止 phone 为 undefined
  const rand = getRandomLetters(2); // 2位随机字母
  return `${now}${ms}${suffix}${rand}`;
};

// ==============================================================================

module.exports = {
  generateBatchNo,
  generateOrderNo,
};
