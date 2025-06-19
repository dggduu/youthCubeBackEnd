const pendingVerifications = new Map();

const rateLimiter = (req, res, next) => {
  const now = Date.now();
  for (const [email, data] of pendingVerifications.entries()) {
    if (now - data.timestamp > 5 * 60 * 1000) { //5分钟超时
      pendingVerifications.delete(email);
    }
  }

  // 检查当前待处理的验证数量
  if (pendingVerifications.size >= parseInt(process.env.MAX_PENDING_VERIFICATIONS || '20')) {
    return res.status(500).json({ 
      error: 'Too many verification requests. Please try again later.' 
    });
  }

  next();
};

module.exports = { rateLimiter, pendingVerifications };