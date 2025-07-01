// authService.js

import { User, RefreshToken } from '../config/Sequelize.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import logger from "../config/pino.js";
import jwt from 'jsonwebtoken';

/**
 * 注册用户
 */
async function registerUser(userData) {
  try {
    const newUser = await User.create(userData);
    return newUser;
  } catch (error) {
    logger.error('注册时发生错误:', error);
    throw error;
  }
}

/**
 * 认证用户登录信息
 */
async function authenticateUser(email, password) {
  try {
    const user = await User.findOne({
      where: { email },
      attributes: ['id', 'email', 'sex', 'password', 'is_member', 'learn_stage', 'avatar_key', 'name']
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await user.validPassword(password);
    if (!isPasswordValid) {
      return null;
    }

    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
    };
    const accessToken = generateAccessToken(accessTokenPayload);

    const refreshTokenPayload = {
      userId: user.id,
    };
    const refreshTokenStr = generateRefreshToken(refreshTokenPayload);

    const decodedRefreshToken = jwt.decode(refreshTokenStr);
    if (!decodedRefreshToken || !decodedRefreshToken.exp) {
      throw new Error('Token 生成错误');
    }
    const expiresAt = new Date(decodedRefreshToken.exp * 1000);

    // 删除旧刷新令牌并创建新的
    await RefreshToken.destroy({ where: { user_id: user.id } });
    await RefreshToken.create({
      user_id: user.id,
      refresh_token: refreshTokenStr,
      expires_at: expiresAt,
    });

    return {
      accessToken,
      refreshToken: refreshTokenStr,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is_member: user.is_member,
        learn_stage: user.learn_stage,
        sex: user.sex,
        ava_url: user.avatar_key,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * 刷新访问令牌
 */
async function refreshAuthToken(oldRefreshToken) {
  try {
    // 验证刷新密钥
    const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);

    const storedRefreshToken = await RefreshToken.findOne({
      where: {
        user_id: decoded.userId,
        refresh_token: oldRefreshToken,
      },
    });

    if (!storedRefreshToken) {
      throw new Error('刷新密钥不存在');
    }

    // 生成新 token
    const newAccessToken = generateAccessToken({ userId: decoded.userId, email: decoded.email });

    const newRefreshToken = generateRefreshToken({ userId: decoded.userId });
    const decodedNewRefreshToken = jwt.decode(newRefreshToken);

    if (!decodedNewRefreshToken || !decodedNewRefreshToken.exp) {
      throw new Error('生成刷新密钥时出现错误');
    }

    const newExpiresAt = new Date(decodedNewRefreshToken.exp * 1000);

    await storedRefreshToken.update({
      refresh_token: newRefreshToken,
      expires_at: newExpiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('刷新令牌已过期，请重新登录。');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('刷新令牌无效，请重新登录。');
    }
    throw new Error('服务器错误，无法刷新令牌。');
  }
}

export {
  registerUser,
  authenticateUser,
  refreshAuthToken,
};