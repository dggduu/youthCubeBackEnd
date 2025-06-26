const express = require('express');
const router = express.Router();
const { rateLimiter } = require('../middleware/rateLimiter');
const { emailVerification, registerFuc, loginFuc, refreshTokenFuc } = require('../controllers/authController.js');
const { User } = require('../config/Sequelize.js');


// 发送验证码
router.post('/send-verification-code', rateLimiter, emailVerification);

// 注册接口
router.post('/register', registerFuc);

// 登录接口
router.post('/login', loginFuc);

// 刷新 Token 接口
router.post('/refresh_token',refreshTokenFuc );

module.exports = router;