import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
    // return next(); // 调试用
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: '认证密钥不存在' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '无效的认证密钥' });
        }
        req.user = user;
        next();
    });
};

export default authenticateToken;