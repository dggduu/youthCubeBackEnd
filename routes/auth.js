const express = require('express');
const router = express.Router();
const { sendVerificationEmail } = require('../services/emailService');
const { rateLimiter } = require('../middleware/rateLimiter');
const { isValidEmail, isValidPassword, isValidDate } = require('../utils/validator');
const db = require('../config/db');

// 发送验证码
router.post('/send-verification-code', rateLimiter, async (req, res) => {
  const { email } = req.body;
  //验证邮箱格式
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  //发送验证码
  const success = await sendVerificationEmail(email); 
  if (!success) {
    return res.status(500).json({ error: 'Failed to send verification code' });
  }
  res.json({ message: 'Verification code sent successfully' });
});

//注册接口
router.post('/register', async (req, res) => {
  const { name, date, learnStage, email, code, pawd } = req.body;

  if (!name || !date || !learnStage || !email || !code || !pawd) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!isValidPassword(pawd)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters long and contain both uppercase and lowercase letters and numbers' 
    });
  }

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  //验证验证码
  const verificationData = require('../services/emailService').pendingVerifications.get(email);
  if (!verificationData) {
    return res.status(400).json({ error: 'Verification code not found or expired' });
  }

  if (verificationData.code !== code) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  //验证通过，删除验证码
  require('../services/emailService').pendingVerifications.delete(email);

  try {
    //插入用户到数据库
    //注意：在生产环境中应该对密码进行哈希处理
    const sql = `INSERT INTO users (name, birth_date, learn_stage, email, password) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    await db.query(sql, [name, date, learnStage, email, pawd]);
    
    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;