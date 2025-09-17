// emailConsultRoutes.js

import express from 'express';
import { sendConsultEmail, fetchAllConsultEmails } from '../services/emailService.js';

const router = express.Router();

/**
 * POST /api/emails/consult/send
 * 发送咨询邮件，参数由前端构造
 */
router.post('/send', async (req, res) => {
  const { to, subject, text, html } = req.body;
  const mailOptions = { to, subject, text, html };

  const success = await sendConsultEmail(mailOptions);

  if (success) {
    return res.status(200).json({ message: '邮件发送成功' });
  } else {
    return res.status(500).json({ message: '邮件发送失败' });
  }
});

/**
 * GET /api/emails/consult/inbox
 * 获取咨询邮箱中的所有邮件
 */
router.get('/inbox', async (req, res) => {
  try {
    const emails = await fetchAllConsultEmails();
    res.status(200).json({ message: '邮件获取成功', emails });
  } catch (error) {
    res.status(500).json({ message: '邮件获取失败', error: error.message });
  }
});

export default router;