const jwt = require('jsonwebtoken');
require('dotenv').config(); // 加载环境变量

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRATION = process.env.ACCESS_TOKEN_EXPIRATION || '15m'; // 默认15分钟
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || '7d'; // 默认7天

/**
 * 生成认证密钥 
 * @param {object} payload - 包含用户信息的负载
 * @returns {string} 认证密钥
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
};

/**
 * 生成刷新密钥
 * @param {object} payload - 包含用户ID的负载
 * @returns {string} 刷新密钥 
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
};

/**
 * 验证认证密钥
 * @param {string} token - 认证密钥
 * @returns {object|null} 解码后的payoff，验证失败返回null
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * 验证刷新密钥
 * @param {string} token - 刷新密钥
 * @returns {object|null} 解码后的负载，验证失败返回null
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};