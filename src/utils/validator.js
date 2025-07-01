// validator.js

/**
 * 验证邮箱格式是否合法
 * @param {string} email - 待验证的邮箱地址
 * @returns {boolean} 是否为合法邮箱
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证密码是否符合要求：
 * 至少8位，包含大小写字母和数字
 * @param {string} password - 待验证的密码
 * @returns {boolean} 是否为合法密码
 */
const isValidPassword = (password) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

/**
 * 验证日期字符串是否为 YYYY-MM-DD 格式且为有效日期
 * @param {string} dateString - 待验证的日期字符串
 * @returns {boolean} 是否为有效日期
 */
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD 格式
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date.toString() !== 'Invalid Date' && !isNaN(date.getTime());
};

export {
  isValidEmail,
  isValidPassword,
  isValidDate,
};