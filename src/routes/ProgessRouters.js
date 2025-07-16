import express from 'express';
const router = express.Router();

import { progressController } from '../controllers/ProgressController.js';
import authenticateToken from '../middleware/authMiddleware.js';

/**
 * @route POST /api/team/:teamId/progress
 * @desc 创建一条团队进度条目
 * @access Private
 */
router.post('/api/team/:teamId/progress', authenticateToken, progressController.createTeamProgress);

/**
 * @route GET /api/team/:teamId/progress
 * @desc 获取某个团队的所有进度条目（分页）
 * @access Private
 */
router.get('/api/team/:teamId/progress', authenticateToken, progressController.getTeamProgressList);


router.get('/api/team/:teamId/progress/year', authenticateToken, progressController.getTeamProgressByYear);
/**
 * @route GET /api/progress/:progressId
 * @desc 获取单条进度详情
 * @access Public
 */
router.get('/api/progress/:progressId',authenticateToken, progressController.getProgressById);

/**
 * @route PUT /api/progress/:id
 * @desc 修改一条进度条目
 * @access Private (仅创建者)
 */
router.put('/api/progress/:id', authenticateToken, progressController.updateProgress);

/**
 * @route DELETE /api/progress/:id
 * @desc 删除一条进度条目
 * @access Private (仅创建者)
 */
router.delete('/api/progress/:id', authenticateToken, progressController.deleteProgress);

// ----------------------------
// 进度评论相关路由
// ----------------------------

/**
 * @route POST /api/progress/:progressId/comments
 * @desc 给进度添加评论
 * @access Private
 */
router.post('/api/progress/:progressId/comments', authenticateToken, progressController.addCommentToProgress);

/**
 * @route GET /api/progress/:progressId/comments
 * @desc 获取某条进度下的一级评论（分页）
 * @access Public
 */
router.get('/api/progress/:progressId/comments', progressController.getCommentsForProgress);

/**
 * @route GET /api/progress/comments/:commentId/replies
 * @desc 获取某条评论的子评论（回复）
 * @access Public
 */
router.get('/api/progress/comments/:commentId/replies', progressController.getRepliesForProgressComment);

/**
 * @route PUT /api/progress/comments/:id
 * @desc 修改评论
 * @access Private（仅本人）
 */
// router.put('/api/progress/comments/:id', authenticateToken, progressController.updateProgressComment);

/**
 * @route DELETE /api/progress/comments/:id
 * @desc 删除评论
 * @access Private（仅本人）
 */
// router.delete('/api/progress/comments/:id', authenticateToken, progressController.deleteProgressComment);

export default router;