/**
 * 处理 LIKE 查询的 SQL 特殊字符转义
 * 作用：防止 `%` `_` `\` 影响 LIKE 语句的查询匹配
 *
 * @param {string} value 用户输入的字符串
 * @return {string} 处理后的字符串
 */
const escapeLike = (value) => {
  if (value == null) return ''; // 处理 null / undefined，避免报错
  return String(value).replace(/[\\%_]/g, '\\$&'); // 统一转字符串并转义
};

module.exports = escapeLike;