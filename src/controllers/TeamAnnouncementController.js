import { TeamAnnouncement, Team, ChatRoomMember, User, ChatRoom } from '../config/Sequelize.js';
import { Op } from 'sequelize';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";

const validateId = (id, name) => {
  const num = parseInt(id, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid ${name} ID`);
  }
  return num;
};

const checkTeamPermissions = async (userId, teamId, transaction, roles = ['owner', 'co_owner']) => {
  const member = await ChatRoomMember.findOne({
    where: {
      user_id: userId,
      role: { [Op.in]: roles },
      '$chatRoom.team_id$': teamId
    },
    include: [{
      model: ChatRoom,
      as: 'chatRoom',
      attributes: []
    }],
    transaction
  });
  return member;
};

export const teamAnnouncementController = {
  /**
   * @route POST /api/teams/:teamId/announcements
   * @desc Create a new team announcement (team leader/manager only)
   * @access Private (Team leader/manager only)
   */
  createAnnouncement: async (req, res) => {
    const transaction = await TeamAnnouncement.sequelize.transaction();
    try {
      const userId = req.user.userId;
      const teamId = validateId(req.params.teamId, 'team');
      const { title, content, is_pinned = false } = req.body;

      if (!title?.trim() || !content?.trim()) {
        await transaction.rollback();
        return res.status(400).json({ message: '标题和内容不能为空' });
      }

      const isLeader = await checkTeamPermissions(userId, teamId, transaction);
      if (!isLeader) {
        await transaction.rollback();
        return res.status(403).json({ message: '只有团队组长或管理员可以发布公告' });
      }

      const filter = getFilter();
      const titleCheck = filter.filter(title, { replace: false });
      const contentCheck = filter.filter(content, { replace: false });
      
      if (titleCheck.words.length > 0 || contentCheck.words.length > 0) {
        await transaction.rollback();
        return res.status(422).json({ 
          message: '内容包含敏感词',
          sensitiveWords: [...new Set([...titleCheck.words, ...contentCheck.words])]
        });
      }

      const announcement = await TeamAnnouncement.create({
        team_id: teamId,
        title: title.trim(),
        content: content.trim(),
        created_by: userId,
        is_pinned,
        status: 'active'
      }, { transaction });

      await transaction.commit();
      res.status(201).json(announcement);
    } catch (error) {
      await transaction.rollback();
      console.error('创建公告失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * @route GET /api/teams/:teamId/announcements
   * @desc Get all announcements for a team (pinned first, then by creation date)
   * @access Private (Team members only)
   */
  getTeamAnnouncements: async (req, res) => {
    try {
      const teamId = validateId(req.params.teamId, 'team');
      const { page = 0, size = 10 } = req.query;
      const { limit, offset } = getPagination(page, size);

      const isMember = await ChatRoomMember.findOne({
        where: {
          user_id: req.user.userId,
          '$chatRoom.team_id$': teamId
        },
        include: [{
          model: ChatRoom,
          as: 'chatRoom',
          attributes: []
        }]
      });

      if (!isMember) {
        return res.status(403).json({ message: '只有团队成员可以查看公告' });
      }

      const announcements = await TeamAnnouncement.findAndCountAll({
        where: {
          team_id: teamId,
          status: 'active'
        },
        order: [
          ['is_pinned', 'DESC'],
          ['created_at', 'DESC']
        ],
        limit,
        offset,
        include: [{
          model: User,
          as: 'author'
        }]
      });

      const response = getPagingData(announcements, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('获取公告失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * @route GET /api/teams/:teamId/announcements/:announcementId
   * @desc Get a specific announcement by ID
   * @access Private (Team members only)
   */
  getAnnouncementById: async (req, res) => {
    try {
      const teamId = validateId(req.params.teamId, 'team');
      const announcementId = validateId(req.params.announcementId, 'announcement');

      const isMember = await ChatRoomMember.findOne({
        where: {
          user_id: req.user.userId,
          '$chatRoom.team_id$': teamId
        },
        include: [{
          model: ChatRoom,
          as: 'chatRoom',
          attributes: []
        }]
      });

      if (!isMember) {
        return res.status(403).json({ message: '只有团队成员可以查看公告' });
      }

      const announcement = await TeamAnnouncement.findOne({
        where: {
          announcement_id: announcementId,
          team_id: teamId,
          status: 'active'
        },
        include: [
          {
            model: User,
            as: 'author',
          },
          {
            model: Team,
            as: 'team',
            attributes: ['team_id', 'team_name']
          }
        ]
      });

      if (!announcement) {
        return res.status(404).json({ message: '公告不存在或已被删除' });
      }

      res.status(200).json(announcement);
    } catch (error) {
      console.error('获取公告详情失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * @route PUT /api/teams/:teamId/announcements/:announcementId
   * @desc Update an announcement (creator or team leader/manager only)
   * @access Private (Creator or team leader/manager only)
   */
  updateAnnouncement: async (req, res) => {
    const transaction = await TeamAnnouncement.sequelize.transaction();
    try {
      const userId = req.user.userId;
      const teamId = validateId(req.params.teamId, 'team');
      const announcementId = validateId(req.params.announcementId, 'announcement');
      const { title, content } = req.body;

      if (!title?.trim() || !content?.trim()) {
        await transaction.rollback();
        return res.status(400).json({ message: '标题和内容不能为空' });
      }

      const announcement = await TeamAnnouncement.findOne({
        where: {
          announcement_id: announcementId,
          team_id: teamId,
          status: 'active'
        },
        transaction
      });

      if (!announcement) {
        await transaction.rollback();
        return res.status(404).json({ message: '公告不存在或已被删除' });
      }

      const isLeader = await checkTeamPermissions(userId, teamId, transaction);
      const isCreator = announcement.created_by === userId;

      if (!isLeader && !isCreator) {
        await transaction.rollback();
        return res.status(403).json({ message: '只有公告创建者或团队管理员可以修改公告' });
      }

      const filter = getFilter();
      const titleCheck = filter.filter(title, { replace: false });
      const contentCheck = filter.filter(content, { replace: false });
      
      if (titleCheck.words.length > 0 || contentCheck.words.length > 0) {
        await transaction.rollback();
        return res.status(422).json({ 
          message: '内容包含敏感词',
          sensitiveWords: [...new Set([...titleCheck.words, ...contentCheck.words])]
        });
      }

      await announcement.update({
        title: title.trim(),
        content: content.trim(),
        updated_at: new Date()
      }, { transaction });

      await transaction.commit();
      res.status(200).json(announcement);
    } catch (error) {
      await transaction.rollback();
      console.error('更新公告失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * @route DELETE /api/teams/:teamId/announcements/:announcementId
   * @desc Delete an announcement (creator or team leader/manager only)
   * @access Private (Creator or team leader/manager only)
   */
  deleteAnnouncement: async (req, res) => {
    const transaction = await TeamAnnouncement.sequelize.transaction();
    try {
      const userId = req.user.userId;
      const teamId = validateId(req.params.teamId, 'team');
      const announcementId = validateId(req.params.announcementId, 'announcement');

      const announcement = await TeamAnnouncement.findOne({
        where: {
          announcement_id: announcementId,
          team_id: teamId,
          status: 'active'
        },
        transaction
      });

      if (!announcement) {
        await transaction.rollback();
        return res.status(404).json({ message: '公告不存在或已被删除' });
      }

      const isLeader = await checkTeamPermissions(userId, teamId, transaction);
      const isCreator = announcement.created_by === userId;

      if (!isLeader && !isCreator) {
        await transaction.rollback();
        return res.status(403).json({ message: '只有公告创建者或团队管理员可以删除公告' });
      }

      await announcement.update({
        status: 'deleted'
      }, { transaction });

      await transaction.commit();
      res.status(200).json({ message: '公告已删除' });
    } catch (error) {
      await transaction.rollback();
      console.error('删除公告失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  /**
   * @route PATCH /api/teams/:teamId/announcements/:announcementId/pin
   * @desc Toggle pin status of an announcement (team leader/manager only)
   * @access Private (Team leader/manager only)
   */
  togglePinAnnouncement: async (req, res) => {
    const transaction = await TeamAnnouncement.sequelize.transaction();
    try {
      const userId = req.user.userId;
      const teamId = validateId(req.params.teamId, 'team');
      const announcementId = validateId(req.params.announcementId, 'announcement');

      const isLeader = await checkTeamPermissions(userId, teamId, transaction);
      if (!isLeader) {
        await transaction.rollback();
        return res.status(403).json({ message: '只有团队组长或管理员可以置顶公告' });
      }

      const announcement = await TeamAnnouncement.findOne({
        where: {
          announcement_id: announcementId,
          team_id: teamId,
          status: 'active'
        },
        transaction
      });

      if (!announcement) {
        await transaction.rollback();
        return res.status(404).json({ message: '公告不存在或已被删除' });
      }

      await announcement.update({
        is_pinned: !announcement.is_pinned
      }, { transaction });

      await transaction.commit();
      res.status(200).json({ 
        message: `公告已${announcement.is_pinned ? '置顶' : '取消置顶'}`,
        is_pinned: announcement.is_pinned
      });
    } catch (error) {
      await transaction.rollback();
      console.error('置顶公告失败:', error);
      const status = error.message.includes('Invalid') ? 400 : 500;
      res.status(status).json({ 
        message: status === 400 ? error.message : '服务器错误',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};