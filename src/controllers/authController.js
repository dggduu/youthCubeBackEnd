// authController.js

import { isValidEmail, isValidPassword, isValidDate } from '../utils/validator.js';
import { registerUser, authenticateUser, refreshAuthToken } from '../services/authService.js';
import { sendVerificationEmail, pendingVerifications } from '../services/emailService.js';
import logger from "../config/pino.js";
import { User } from '../config/Sequelize.js'
const emailVerification = async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: '无效的邮箱地址' });
  }
  const success = await sendVerificationEmail(email);
  if (!success) {
    return res.status(500).json({ error: '无法发送邮件' });
  }
  res.json({ message: '认证邮件发送成功' });
};

const registerFuc = async (req, res) => {
  const { name, date, learnStage, email, code, pswd, sex, ava_url } = req.body;
  if (!name || !date || !learnStage || !email || !code || !pswd) {
    return res.status(400).json({ error: '缺少必要信息' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '无效的邮箱地址' });
  }
  if (!isValidPassword(pswd)) {
    return res.status(400).json({
      error: '密码必须大于8个字符长度，且包含大小写字母，数字，特殊字符'
    });
  }
  if (!isValidDate(date)) {
    return res.status(400).json({ error: '无效的时间戳格式' });
  }

  const validSexes = ['男', '女', '不想说'];
  if (sex && !validSexes.includes(sex)) {
    return res.status(400).json({ error: '无效的性别选项' });
  }

  let avatarKey = null;
  if (ava_url) {
    if (!/^https?:\/\//i.test(ava_url.trim())) {
      return res.status(400).json({ error: '无效的头像地址' });
    }
    try {
      const url = new URL(ava_url.trim());
      avatarKey = url.pathname + url.search;
    } catch (err) {
      return res.status(400).json({ error: '无效的头像地址' });
    }
  }

  const verificationData = pendingVerifications.get(email);
  if (!verificationData) {
    return res.status(400).json({ error: '认证码不存在' });
  }
  if (verificationData.code !== code) {
    return res.status(400).json({ error: '认证码不正确' });
  }
  pendingVerifications.delete(email);

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    const userData = {
      name,
      birth_date: date,
      learn_stage: learnStage,
      email,
      password: pswd,
      sex: sex || null,
      avatar_key: avatarKey || null,
    };

    await registerUser(userData);
    res.json({ message: '注册成功' });

  } catch (error) {
    logger.error('注册时遇到错误:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: '邮件已被注册' });
    }
    res.status(500).json({ error: '服务器错误' });
  }
};

const loginFuc = async (req, res) => {
  const { email, pswd } = req.body;

  if (!email || !pswd) {
    return res.status(400).json({ error: 'Email or password missing' });
  }

  try {
    const authResult = await authenticateUser(email, pswd);

    if (!authResult) {
      return res.status(401).json({ error: 'Incorrect email or password' });
    }

    res.json({
      message: 'Login successful',
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: authResult.user,
    });

  } catch (error) {
    logger.error('登录时遇到错误:', error);
    res.status(500).json({ error: '服务器错误' });
  }
};

const refreshTokenFuc = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ error: '刷新密钥未提供' });
  }

  try {
    const result = await refreshAuthToken(refreshToken);

    if (!result) {
      return res.status(403).json({ error: '非法的刷新密钥' });
    }

    res.json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });

  } catch (error) {
    logger.error('Error refreshing token:', error.message);
    return res.status(403).json({ error: error.message });
  }
};

export {
  emailVerification,
  registerFuc,
  loginFuc,
  refreshTokenFuc
};