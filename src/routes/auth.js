import express from 'express';
import {
  registerFuc,
  loginFuc,
  refreshTokenFuc,
  generateCaptcha,
} from '../controllers/authController.js';

import authMiddleware from "../middleware/authMiddleware.js";

// 因为不可抗力，邮件功能无法使用，改为从客服申请修改密码

const router = express.Router();

// 发送验证码
// router.post('/api/send-verification-code', rateLimiter, emailVerification);

// 注册接口
router.post('/api/register', registerFuc);

// 登录接口
router.post('/api/login', loginFuc);

// 刷新 Token 接口
router.post('/api/refresh_token', refreshTokenFuc);

// 用于在 SplashScreen 验证登录状态
router.get('/api/auth/status', authMiddleware, async (req, res)=>{
  return res.status(200).json({
    "status": "success",
  });
});

// 生成行为验证码
router.get('/api/captcha-gen', generateCaptcha);

// 发送重置邮箱验证码
// router.post('/api/find-pswd', rateLimiter, findPassword);

// 重置密码

export default router;