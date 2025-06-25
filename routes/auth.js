const express = require('express');
const router = express.Router();
const { sendVerificationEmail } = require('../services/emailService');
const { rateLimiter } = require('../middleware/rateLimiter');
const { isValidEmail, isValidPassword, isValidDate } = require('../utils/validator');
const db = require('../config/db');

const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');

// 发送验证码
router.post('/send-verification-code', rateLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  const success = await sendVerificationEmail(email);
  if (!success) {
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
  res.json({ message: 'Verification code sent successfully' });
});

const bcrypt = require('bcrypt');

// 注册接口
router.post('/register', async (req, res) => {
  const { name, date, learnStage, email, code, pswd, sex, ava_url } = req.body;
  console.log("register: ",req.body);
  if (!name || !date || !learnStage || !email || !code || !pswd) {
    return res.status(400).json({ error: '缺少必要信息' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!isValidPassword(pswd)) {
    return res.status(400).json({
      error: '密码长度8字符以上，必须包含大小写数字特殊字符'
    });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const validSexes = ['男', '女', '不想说'];
  if (sex && !validSexes.includes(sex)) {
    return res.status(400).json({ error: 'Invalid value for sex' });
  }

  let avatarUrl = ava_url ? ava_url.trim() : '';
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
    return res.status(400).json({ error: 'Invalid avatar URL' });
  }

  const pendingVerifications = require('../services/emailService').pendingVerifications;
  const verificationData = pendingVerifications.get(email);
  if (!verificationData) {
    return res.status(400).json({ error: 'Verification code not found or expired' });
  }
  if (verificationData.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  pendingVerifications.delete(email);

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(pswd, 10);
  } catch (err) {
    console.error('Password hash failed:', err);
    return res.status(500).json({ error: 'Registration failed' });
  }

  let avatarKey = null;
  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl);
      avatarKey = url.pathname + url.search;
    } catch (err) {
      return res.status(400).json({ error: 'Invalid avatar URL format' });
    }
  }

  try {
    const sql = `
      INSERT INTO users 
        (name, birth_date, learn_stage, email, password, sex, avatar_key) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.query(sql, [
      name,
      date,
      learnStage,
      email,
      hashedPassword,
      sex || null,
      avatarKey || null
    ]);

    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, pswd } = req.body;
  console.log("email:",email,"pswd:",pswd);
  if (!email || !pswd) {
    return res.status(400).json({ error: '缺少邮箱或密码' });
  }

  try {
    const [rows] = await db.query('SELECT id, email, password, is_member FROM users WHERE email = ?', [email]);
    const user_data = rows;
    console.log('user',rows);
    if (!user_data.id) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }

    const isPasswordValid = await bcrypt.compare(pswd, user_data.password);
    console.log("ori:",pswd,"now:",user_data.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '邮箱或密码不正确' });
    }

    // 生成 认证密钥 与 刷新密钥
    const accessTokenPayload = {
      userId: user_data.id,
      email: user_data.email,
    };
    const accessToken = generateAccessToken(accessTokenPayload);

    // 创建 payload 对象
    const refreshTokenPayload = {
      userId: user_data.id,
    };
    const refreshToken = generateRefreshToken(refreshTokenPayload);

    // 插入refresh_token数据表
    const decodedRefreshToken = jwt.decode(refreshToken);
    if (!decodedRefreshToken || !decodedRefreshToken.exp) {
        console.error("Refresh token does not contain 'exp' claim.");
        return res.status(500).json({ error: 'Internal server error: Token generation issue.' });
    }
    const expiresAt = new Date(decodedRefreshToken.exp * 1000);
    const insertSql = `
        INSERT INTO refresh_tokens (user_id, refresh_token, expires_at)
        VALUES (?, ?, ?)
    `;
    await db.query(insertSql, [user_data.id, refreshToken, expiresAt]);

    // 返回 Token
    res.json({
      message: '登录成功',
      accessToken,
      refreshToken,
      user: {
        id: user_data.id,
        email: user_data.email,
        is_member: user_data.is_member,
      }
    });

  } catch (error) {
    console.error('Database error during login:', error);
    res.status(500).json({ error: '服务器错误，请稍后再试' });
  }
});

// 刷新 Token 接口
router.post('/refresh_token', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: '没有上传刷新令牌' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const [tokenRows] = await db.query('SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ?', [decoded.userId, refreshToken]);
        if (tokenRows.length === 0) {
            return res.status(403).json({ error: '无效或已吊销的刷新令牌' });
        }
        // 如果验证成功，生成新的 Access Token
        const newAccessToken = generateAccessToken({ userId: decoded.userId, email: decoded.email });
        // 插入新的刷新令牌
        const newRefreshToken = generateRefreshToken({ userId: decoded.userId });
        await db.query('UPDATE refresh_tokens SET token = ? WHERE user_id = ? AND token = ?', [newRefreshToken, decoded.userId, refreshToken]);

        res.json({
            accessToken: newAccessToken,
        });

    } catch (error) {
        console.error('刷新令牌验证失败:', error.message);
        return res.status(403).json({ error: '刷新令牌无效或已过期，请重新登录' });
    }
});

module.exports = router;