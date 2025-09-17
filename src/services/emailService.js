// emailService.js

import nodemailer from 'nodemailer';
import logger from "../config/pino.js";
import dotenv from 'dotenv';
import Imap from 'imap';
import { simpleParser } from 'mailparser';
// 加载环境变量
dotenv.config();

// 创建SMTP服务
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 引入存储验证码的 Map
const { pendingVerifications } = await import('../middleware/rateLimiter.js');

/**
 * 发送验证码邮件
 * @param {string} email - 接收者的邮箱地址
 * @returns {Promise<boolean>} 是否发送成功
 */
const sendVerificationEmail = async (email) => {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  pendingVerifications.set(email, {
    code: verificationCode,
    timestamp: Date.now()
  });

  const mailOptions = {
    from: `"青智立方团队" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '注册验证码',
    text: `您的验证码是：${verificationCode}\n该验证码将在5分钟后失效。`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px;">
          <img src="https://s21.ax1x.com/2025/06/19/pVVEzbn.png" alt="pVVEzbn.png" style="width: 50px;margin-top: 20px;" />
          <h2 style="color: #333;">注册验证码</h2>
          <p>尊敬的用户，</p>
          <p>您正在注册我们的服务，请使用以下验证码完成验证：</p>
          <div style="
              font-size: 24px;
              font-weight: bold;
              color: #000000;
              background-color: #d6e6fc;
              border: 2px solid #95c1ff;
              border-radius: 15px;
              padding: 20px 100px;
              text-align: center;
              margin: 30px auto;
              max-width: 300px;
              ">
              ${verificationCode}
          </div>
          <p>该验证码将在 <strong>5分钟</strong> 内有效。</p>
          <p>如果您没有进行此操作，请忽略本邮件。</p>
          <br>
          <p>祝好，<br><strong>青智立方团队</strong></p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('邮件发送成功:', info.messageId, '验证码:', verificationCode, '邮箱:', email);
    return true;
  } catch (error) {
    logger.error('邮件发送失败:', error);
    pendingVerifications.delete(email);
    return false;
  }
};


const sendPasswordResetEmail = async (email) => {
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

  pendingVerifications.set(email, {
    code: verificationCode,
    timestamp: Date.now()
  });
  const mailOptions = {
    from: `"青智立方团队" <${process.env.SMTP_USER}>`,
    to: email,
    subject: '重置您的密码',
    text: `您的验证码是：${verificationCode}\n该验证码将在5分钟后失效。`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 10px 20px; border-radius: 8px;">
          <img src="https://s21.ax1x.com/2025/06/19/pVVEzbn.png" alt="pVVEzbn.png" style="width: 50px;margin-top: 20px;" />
          <h2 style="color: #333;">注册验证码</h2>
          <p>尊敬的用户，</p>
          <p>我们收到了您更改密码的请求，请使用以下验证码完成验证：</p>
          <div style="
              font-size: 24px;
              font-weight: bold;
              color: #000000;
              background-color: #fff9e4;
              border: 2px solid #f8e287;
              border-radius: 15px;
              padding: 20px 100px;
              text-align: center;
              margin: 30px auto;
              max-width: 300px;
              ">
              ${verificationCode}
          </div>
          <p>该验证码将在 <strong>5分钟</strong> 内有效。</p>       
          <p>如果您没有进行此操作，请忽略本邮件。</p>
          <br>
          <p>祝好，<br><strong>青智立方团队</strong></p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info('重置密码邮件发送成功:', info.messageId, '邮箱:', email);
    return true;
  } catch (error) {
    logger.error('重置密码邮件发送失败:', error);
    return false;
  }
};

const consultImap = new Imap({
  user: process.env.SMTP_CONSULT_USER,
  password: process.env.SMTP_CONSULT_PASS,
  host: process.env.SMTP_HOST,
  port: process.env.IMAP_PORT || 993, // 通常 IMAP 使用 993 端口
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});


/**
 * 发送由前端构造的邮件
 * @param {Object} mailOptions - 邮件选项，包含 to, subject, text/html
 * @returns {Promise<boolean>} 是否发送成功
 */
const sendConsultEmail = async (mailOptions) => {
  try {
    const info = await consultTransporter.sendMail({
      ...mailOptions,
      from: `"咨询中心" <${process.env.SMTP_CONSULT_USER}>`,
    });
    logger.info('咨询邮件发送成功:', info.messageId);
    return true;
  } catch (error) {
    logger.error('咨询邮件发送失败:', error);
    return false;
  }
};

/**
 * 获取咨询邮箱中的所有邮件
 * @returns {Promise<Array>} 邮件数组
 */
const fetchAllConsultEmails = async () => {
  return new Promise((resolve, reject) => {
    const emails = [];
    consultImap.once('ready', () => {
      consultImap.openBox('INBOX', false, (err, box) => {
        if (err) {
          logger.error('打开收件箱失败:', err);
          return reject(err);
        }
        // 搜索所有邮件
        consultImap.search(['ALL'], (err, results) => {
          if (err || !results || results.length === 0) {
            consultImap.end();
            return resolve(emails);
          }
          const f = consultImap.fetch(results, { bodies: '' });
          f.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (err) {
                  logger.error('解析邮件失败:', err);
                  return;
                }
                emails.push({
                  from: parsed.from.text,
                  to: parsed.to.text,
                  subject: parsed.subject,
                  text: parsed.text,
                  html: parsed.html,
                  date: parsed.date
                });
              });
            });
          });
          f.once('error', (err) => {
            logger.error('获取邮件失败:', err);
            reject(err);
          });
          f.once('end', () => {
            logger.info(`成功获取 ${emails.length} 封邮件。`);
            consultImap.end();
            resolve(emails);
          });
        });
      });
    });
    consultImap.once('error', (err) => {
      logger.error('IMAP连接错误:', err);
      reject(err);
    });
    consultImap.connect();
  });
};

export { sendVerificationEmail, pendingVerifications,sendPasswordResetEmail, sendConsultEmail, fetchAllConsultEmails};