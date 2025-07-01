import express from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';
import {
  emailVerification,
  registerFuc,
  loginFuc,
  refreshTokenFuc
} from '../controllers/authController.js';

const router = express.Router();

// 发送验证码
router.post('/send-verification-code', rateLimiter, emailVerification);

// 注册接口
router.post('/register', registerFuc);

// 登录接口
router.post('/login', loginFuc);

// 刷新 Token 接口
router.post('/refresh_token', refreshTokenFuc);

export default router;