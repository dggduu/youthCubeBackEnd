// rateLimiter.js

const pendingVerifications = new Map();

const rateLimiter = (req, res, next) => {
  const now = Date.now();
  

  for (const [email, data] of pendingVerifications.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { // 5分钟后删除
      pendingVerifications.delete(email);
    }
  }

  if (pendingVerifications.size >= parseInt(process.env.MAX_PENDING_VERIFICATIONS || '20')) {
    return res.status(500).json({ 
      error: '验证码请求太多，请稍后再试' 
    });
  }

  next();
};

export { rateLimiter, pendingVerifications };