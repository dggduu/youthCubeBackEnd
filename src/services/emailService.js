const nodemailer = require('nodemailer');
require('dotenv').config();

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

// 存储验证码
const { pendingVerifications } = require('../middleware/rateLimiter');

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
          <img src="https://s21.ax1x.com/2025/06/19/pVVEzbn.png" alt="pVVEzbn.png" style="width: 50px;margin-top: 20px;;" />
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
    console.log('邮件发送成功:', info.messageId,'验证码:',verificationCode,'邮箱:',email);
    return true;
  } catch (error) {
    console.error('邮件发送失败:', error);
    pendingVerifications.delete(email);
    return false;
  }
};

module.exports = { sendVerificationEmail, pendingVerifications };