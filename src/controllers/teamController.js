import { Team, TeamTag, tags, ChatRoom, ChatRoomMember,ProjectResult, User, Invitation,Message } from '../config/Sequelize.js';
import { Op, sequelize } from '../config/Sequelize.js';


import { getPagination, getPagingData } from '../utils/pagination.js';

export const teamController = {
  /**
   * @route POST /api/teams
   * @desc Create a new team and its corresponding chat room
   * @access Private
   */
  createTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;

    try {
      const { team_name, description, tagIds, is_public, grade } = req.body;
      if (!team_name) {
        return res.status(400).json({ message: '需要队伍名称' });
      }

      // 校验 is_public 是否为布尔值
      if (typeof is_public !== 'undefined' && ![0, 1].includes(Number(is_public))) {
        return res.status(400).json({ message: 'is_public 必须是 0 或 1' });
      }

      // 检查用户是否已加入其他队伍
      const user = await User.findOne({
        where: { id: user_id },
        attributes: ['id', 'team_id'],
        transaction
      });

      if (!user) {
        await transaction.rollback();
        return res.status(404).json({ message: '用户不存在' });
      }

      if (user.team_id !== null) {
        await transaction.rollback();
        return res.status(400).json({ message: '您已加入其他队伍，请先退出' });
      }

      // 创建队伍
      const newTeam = await Team.create({
        team_name,
        description,
        is_public: Number(is_public),
        grade,
      }, { transaction });

      // 更新用户的 team_id
      await User.update(
        { team_id: newTeam.team_id },
        {
          where: { id: user_id },
          transaction
        }
      );

      // 创建聊天室
      const chatRoomName = `${newTeam.team_name} 聊天室`;
      const chatRoom = await ChatRoom.create({
        type: 'team',
        name: chatRoomName,
        team_id: newTeam.team_id
      }, { transaction });

      // 设置当前用户为该聊天室的 owner
      await ChatRoomMember.create({
        room_id: chatRoom.room_id,
        user_id: user_id,
        joined_at: new Date(),
        role: 'owner'
      }, { transaction });

      // 如果有 tags，写入中间表 team_tags
      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const teamTagRecords = tagIds.map(tag_id => ({
          team_id: newTeam.team_id,
          tag_id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        await TeamTag.bulkCreate(teamTagRecords, { transaction });
      }

      // 提交事务
      await transaction.commit();

      res.status(201).json({ message: '队伍和聊天室成功创建', team_id: newTeam.team_id });
    } catch (error) {
      await transaction.rollback(); // 出错回滚
      console.error('创建队伍和聊天室时遇到问题:', error);
      res.status(500).json({ message: '内部错误：', error: error.message });
    }
  },

  /**
   * @route GET /api/teams
   * @desc Get all teams with pagination and search
   * @access Public
   */
  getAllTeams: async (req, res) => {
    try {
      const { page, size, search } = req.query;
      const { limit, offset } = getPagination(page, size);

      // 构建 where 查询条件：仅查询 is_public = 1 的团队
      const whereCondition = {
        is_public: 1,
        ...(search && { team_name: { [Op.like]: `%${search}%` } }),
      };

      const data = await Team.findAndCountAll({
        attributes: { exclude: ['description'] },
        where: whereCondition,
        limit,
        offset,
        order: [['create_at', 'DESC']],
        include: [{
          model: tags,
          as: 'tags',
          attributes: ['tag_id', 'tag_name'],
          through: { attributes: [] },
          required: false
        }]
      });

      const teams = data.rows;
      teams.forEach(team => {
        if (team.tags && team.tags.length > 3) {
          team.tags = team.tags.slice(0, 3);
        }
      });

      const response = getPagingData(data, page, limit);
      res.status(200).json(response);
    } catch (error) {
      console.error('Get all teams error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/teams/:id
   * @desc Get a team by ID
   * @access Public
   */
  getTeamById: async (req, res) => {
    try {
      const { id } = req.params;

      const team = await Team.findByPk(id, {
        include: [
          {
            model: tags,
            as: 'tags',
            attributes: ['tag_id', 'tag_name'],
            through: { attributes: [] }
          },
          {
            model: ProjectResult,
            as: 'projectResults',
            required: false,
            attributes: [
              'result_id',
              'team_id',
              'type',
              'is_completed',
              'completed_at',
              [sequelize.literal(`CASE WHEN projectResults.type = 'article' THEN projectResults.post_id ELSE NULL END`), 'post_id']
            ]
          },
          {
            model: ChatRoom,
            as: 'chatRoom',
            attributes: ['room_id','name'],
            include: [{
              model: ChatRoomMember,
              as: 'members',
              attributes: ['user_id', 'role', 'joined_at'],
              include: [{
                model: User,
                as: 'member',
                attributes: ['id', 'name', 'avatar_key']
              }]
            }]
          }
        ]
      });

      if (!team) {
        return res.status(404).json({ message: 'Team not found.' });
      }

      const teamData = team.get({ plain: true });

      if (teamData.chatRoom?.members) {
        teamData.chatRoom.members = teamData.chatRoom.members.map(member => ({
          user_id: member.user_id,
          name: member.member?.name,
          avatar: member.member?.avatar_key,
          role: member.role,
          joined_at: member.joined_at
        }));
      }

      res.status(200).json(teamData);
    } catch (error) {
      console.error('Get team by ID error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route PUT /api/teams/:id
   * @desc Update a team by ID
   * @access Private (Admin or team owner/manager)
   */
  updateTeam: async (req, res) => {
    try {
      const { id } = req.params;
      const { team_name, description, is_public } = req.body;

      if (!team_name) {
        return res.status(400).json({ message: 'Team name is required.' });
      }

      const [updated] = await Team.update(
        { team_name, description, is_public },
        { where: { team_id: id } }
      );

      if (updated) {
        const updatedTeam = await Team.findByPk(id);
        return res.status(200).json({ message: 'Team updated successfully.', team: updatedTeam });
      }

      res.status(404).json({ message: 'Team not found or no changes made.' });
    } catch (error) {
      console.error('Update team error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route DELETE /api/teams/:id
   * @desc Delete a team by ID
   * @access Private (Admin or team owner/manager)
   */
  deleteTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      // 1. 验证团队和权限
      const team = await Team.findOne({
        where: { team_id: id },
        include: [
          {
            model: ChatRoom,
            as: 'chatRoom',
            include: [
              {
                model: ChatRoomMember,
                as: 'members',
                where: { user_id: currentUserId, role: 'owner' },
                required: true,
              },
            ],
          },
        ],
        transaction,
      });

      if (!team) {
        await transaction.rollback();
        return res.status(403).json({
          message: '无权删除此团队或团队不存在',
        });
      }

      // 2. 获取所有团队成员ID
      const members = await ChatRoomMember.findAll({
        where: { room_id: team.chatRoom.room_id },
        attributes: ['user_id'],
        transaction,
      });
      const memberIds = members.map((m) => m.user_id);

      // 删除项目成果
      await ProjectResult.destroy({
        where: { team_id: id },
        transaction,
      });

      // 3. 删除消息记录
      await Message.destroy({
        where: { room_id: team.chatRoom.room_id },
        transaction,
      });

      // 删除邀请
      await Invitation.destroy({
        where: { team_id: id },
        transaction,
      });

      // 删除团队标签
      await TeamTag.destroy({
        where: { team_id: id },
        transaction,
      });

      // 删除聊天室成员
      await ChatRoomMember.destroy({
        where: { room_id: team.chatRoom.room_id },
        transaction,
      });

      // 删除聊天室
      await ChatRoom.destroy({
        where: { room_id: team.chatRoom.room_id },
        transaction,
      });

      // 4. 更新成员的 team_id
      await User.update(
        { team_id: null },
        {
          where: { id: memberIds },
          transaction,
        }
      );

      // 5. 最后删除团队
      await Team.destroy({
        where: { team_id: id },
        transaction,
      });

      await transaction.commit();
      return res.status(204).send();

    } catch (error) {
      await transaction.rollback();
      console.error('删除团队失败:', error);

      // 改进错误提示
      if (error.name === 'SequelizeForeignKeyConstraintError') {
        let message = '删除失败，请先清理关联数据';
        let solution = '请确保已删除所有聊天消息、项目成果等关联记录';

        // 针对 project_results 特殊提示
        if (error.table === 'teams' && error.index === 'project_results_ibfk_1') {
          message = '无法删除团队：该团队已有项目成果记录';
          solution = '请先删除该团队提交的项目成果';
        }

        return res.status(409).json({
          message,
          detail: error.parent?.sqlMessage,
          solution,
          code: 'FOREIGN_KEY_CONSTRAINT',
        });
      }

      return res.status(500).json({
        message: '删除团队失败',
        error: process.env.NODE_ENV === 'development' ? error.message : '服务器错误',
      });
    }
  }

};