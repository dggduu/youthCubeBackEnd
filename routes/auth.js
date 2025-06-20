const express = require('express');
const router = express.Router();
const { sendVerificationEmail } = require('../services/emailService');
const { rateLimiter } = require('../middleware/rateLimiter');
const { isValidEmail, isValidPassword, isValidDate } = require('../utils/validator');
const db = require('../config/db');

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
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  if (!isValidPassword(pswd)) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long and contain both uppercase and lowercase letters and numbers'
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

module.exports = router;