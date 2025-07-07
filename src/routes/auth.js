import express from 'express';
import { rateLimiter } from '../middleware/rateLimiter.js';
import {
  emailVerification,
  registerFuc,
  loginFuc,
  refreshTokenFuc
} from '../controllers/authController.js';

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// 发送验证码
router.post('/api/send-verification-code', rateLimiter, emailVerification);

// 注册接口
router.post('/api/register', registerFuc);

// 登录接口
router.post('/api/login', loginFuc);

// 刷新 Token 接口
router.post('/api/refresh_token', refreshTokenFuc);

router.get('/api/auth/status', authMiddleware, async (req, res)=>{
  return res.status(200).json({
    "status": "success",
  });
});

export default router;