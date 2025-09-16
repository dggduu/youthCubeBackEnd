import { Team, TeamTag, tags, ChatRoom, ChatRoomMember,ProjectResult, User, Invitation,Message, TeamAnnouncement } from '../config/Sequelize.js';
import { Op, sequelize } from '../config/Sequelize.js';


import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";
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
      const { team_name, description, tagIds, is_public, grade, img_url } = req.body;
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
      const filter = getFilter();
      const result = filter.filter(team_name , { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "队名含有敏感词"});
      }
      const DesResult = filter.filter(description , { replace: false });
      if (DesResult.words.length > 0) {
        return res.status(422).json({message : "描述含有敏感词"});
      }
      // 创建队伍
      const newTeam = await Team.create({
        team_name,
        description,
        is_public: Number(is_public),
        grade,
        img_url
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
   * @desc Get all top-level public teams (exclude sub-teams) with pagination and search
   * @access Public
   */
  getAllTeams: async (req, res) => {
    try {
      const { page, size, search } = req.query;
      const { limit, offset } = getPagination(page, size);

      // 仅查询顶层团队
      const whereCondition = {
        is_public: true,
        parent_team_id: null,
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
      // 限制每个团队最多返回 3 个标签
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
  getAllTeamsNoPaging: async (req, res) => {
    try {
      const { page, size, search } = req.query;

      // 仅查询顶层团队
      const whereCondition = {
        is_public: true,
        parent_team_id: null,
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
      // 限制每个团队最多返回 3 个标签
      teams.forEach(team => {
        if (team.tags && team.tags.length > 3) {
          team.tags = team.tags.slice(0, 3);
        }
      });

      res.status(200).json(data);
    } catch (error) {
      console.error('Get all teams error:', error);
      res.status(500).json({ message: 'Server error.', error: error.message });
    }
  },

  /**
   * @route GET /api/teams/:id
   * @desc Get a team by ID, including its sub-teams
   * @access Public
   */
  getTeamById: async (req, res) => {
    try {
      const { id } = req.params;

      const team = await Team.findByPk(id, {
        include: [
          // 标签
          {
            model: tags,
            as: 'tags',
            attributes: ['tag_id', 'tag_name'],
            through: { attributes: [] },
            required: false
          },
          // 项目成果
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
          // 聊天室及成员
          {
            model: ChatRoom,
            as: 'chatRoom',
            attributes: ['room_id', 'name'],
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
          },
          // 查询子团队
          {
            model: Team,
            as: 'subTeams',
            attributes: [
              'team_id', 
              'team_name', 
              'description', 
              'create_at', 
              'grade', 
              'is_public'
            ],
            include: [
              // 子团队的标签
              {
                model: tags,
                as: 'tags',
                attributes: ['tag_id', 'tag_name'],
                through: { attributes: [] },
                required: false
              },
              // 子团队的聊天室
              {
                model: ChatRoom,
                as: 'chatRoom',
                required: false
              }
            ],
            required: false
          }
        ]
      });

      if (!team) {
        return res.status(404).json({ message: 'Team not found.' });
      }

      const teamData = team.get({ plain: true });

      // 处理聊天室成员信息
      if (teamData.chatRoom?.members) {
        teamData.chatRoom.members = teamData.chatRoom.members.map(member => ({
          user_id: member.user_id,
          name: member.member?.name,
          avatar: member.member?.avatar_key,
          role: member.role,
          joined_at: member.joined_at
        }));
      }

      // 处理子团队标签数量限制（最多3个）
      if (teamData.subTeams) {
        teamData.subTeams.forEach(sub => {
          if (sub.tags && sub.tags.length > 3) {
            sub.tags = sub.tags.slice(0, 3);
          }
        });
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
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { team_name, description, is_public, grade, img_url, tag_ids } = req.body;

      const updateFields = {};
      if (team_name !== undefined) updateFields.team_name = team_name;
      if (description !== undefined) updateFields.description = description;
      if (is_public !== undefined) updateFields.is_public = is_public;
      if (grade !== undefined) updateFields.grade = grade;
      if (img_url !== undefined) updateFields.img_url = img_url;

      if (Object.keys(updateFields).length === 0 && !tag_ids) {
        return res.status(400).json({ message: 'No fields to update.' });
      }

      // 1. 更新团队基本信息
      let updatedCount = 0;
      if (Object.keys(updateFields).length > 0) {
        [updatedCount] = await Team.update(updateFields, {
          where: { team_id: id },
          transaction
        });

        if (updatedCount === 0) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Team not found or no changes made.' });
        }
      }

      // 2. 如果有 tag_ids，同步更新 team_tags 表
      if (tag_ids !== undefined) {
        if (!Array.isArray(tag_ids)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'tag_ids must be an array.' });
        }

        // 验证所有 tag_id 是否存在
        const existingTags = await tags.findAll({
          where: { tag_id: tag_ids },
          attributes: ['tag_id'],
          transaction
        });
        const validTagIds = existingTags.map(t => t.tag_id);
        if (validTagIds.length !== tag_ids.length) {
          await transaction.rollback();
          return res.status(400).json({ message: 'Some tag_ids are invalid.' });
        }

        // 删除旧的 team_tags 记录
        await TeamTag.destroy({
          where: { team_id: id },
          transaction
        });

        // 插入新的 team_tags 记录
        if (tag_ids.length > 0) {
          const teamTagRecords = tag_ids.map(tag_id => ({
            team_id: id,
            tag_id
          }));
          await TeamTag.bulkCreate(teamTagRecords, { transaction });
        }
      }

      await transaction.commit();

      // 返回更新后的团队信息
      const updatedTeam = await Team.findByPk(id, {
        include: [
          {
            model: tags,
            as: 'tags',
            through: { attributes: [] }
          }
        ]
      });

      return res.status(200).json({
        message: 'Team updated successfully.',
        team: updatedTeam
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Update team error:', error);
      res.status(500).json({
        message: 'Server error.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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

      // 1. 验证当前用户是否是该团队的 owner
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

      // 2. 递归查询所有子团队（包括子子孙孙）
      const allTeamIds = new Set(); // 使用 Set 防止重复
      const visited = new Set();

      const collectSubTeams = async (parentId) => {
        if (visited.has(parentId)) return; // 防止循环引用
        visited.add(parentId);

        const subTeams = await Team.findAll({
          where: { parent_team_id: parentId },
          attributes: ['team_id'],
          transaction,
        });

        for (const subTeam of subTeams) {
          if (!allTeamIds.has(subTeam.team_id)) {
            allTeamIds.add(subTeam.team_id);
            await collectSubTeams(subTeam.team_id); // 递归
          }
        }
      };

      // 从当前团队开始，收集所有子团队
      await collectSubTeams(id);
      allTeamIds.add(Number(id)); // 包含自己

      const teamIdsArray = Array.from(allTeamIds);
      if (teamIdsArray.length === 0) {
        await transaction.rollback();
        return res.status(404).json({ message: '未找到可删除的团队' });
      }

      // 3. 获取所有相关 chatRoomIds
      const chatRooms = await ChatRoom.findAll({
        where: { team_id: teamIdsArray },
        attributes: ['room_id'],
        transaction,
      });
      const roomIds = chatRooms.map(cr => cr.room_id);

      // 4. 批量删除所有关联数据（按依赖顺序）
      await TeamAnnouncement.destroy({
        where: { team_id: teamIdsArray },
        transaction,
      });
      // 删除项目成果
      await ProjectResult.destroy({
        where: { team_id: teamIdsArray },
        transaction,
      });

      // 删除邀请
      await Invitation.destroy({
        where: { team_id: teamIdsArray },
        transaction,
      });

      // 删除团队标签
      await TeamTag.destroy({
        where: { team_id: teamIdsArray },
        transaction,
      });

      // 删除聊天消息
      await Message.destroy({
        where: { room_id: roomIds },
        transaction,
      });

      // 获取所有受影响的用户 ID
      const allMembers = await ChatRoomMember.findAll({
        where: { room_id: roomIds },
        attributes: ['user_id'],
        transaction,
      });
      const memberIds = [...new Set(allMembers.map(m => m.user_id))];

      // 6. 更新用户 team_id 为 null
      if (memberIds.length > 0) {
        await User.update(
          { team_id: null },
          {
            where: { id: memberIds },
            transaction,
          }
        );
      }

      // 删除聊天室成员
      await ChatRoomMember.destroy({
        where: { room_id: roomIds },
        transaction,
      });

      // 删除聊天室
      await ChatRoom.destroy({
        where: { room_id: roomIds },
        transaction,
      });

      // 7. 删除所有团队（包括子团队）
      await Team.destroy({
        where: { team_id: teamIdsArray },
        transaction,
      });

      await transaction.commit();

      return res.status(204).send();

    } catch (error) {
      await transaction.rollback();
      console.error('删除团队失败:', error);

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        let message = '删除失败，请先清理关联数据';
        let solution = '请确保已删除所有聊天消息、项目成果等关联记录';

        if (error.table === 'teams' && error.index === 'project_results_ibfk_1') {
          message = '无法删除团队：该团队或其子团队已有项目成果记录';
          solution = '请先删除相关团队提交的项目成果';
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
  },
  /**
   * @route POST /api/teams/:id/subteam
   * @desc 创建子团队（仅限父团队的 owner）
   * @access Private (Parent team owner only)
   */
  createSubTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;
    const parentTeamId = parseInt(req.params.id, 10);

    try {
      if (!parentTeamId || isNaN(parentTeamId)) {
        return res.status(400).json({ message: '无效的父团队ID' });
      }

      const { team_name, description="" } = req.body;

      if (!team_name) {
        return res.status(400).json({ message: '需要队伍名称' });
      }

      // 校验 is_public
      const isPublic = typeof is_public !== 'undefined' ? Boolean(is_public) : true;

      // 检查当前用户是否为父团队的 owner
      const parentTeam = await Team.findOne({
        where: { team_id: parentTeamId },
        include: [{
          model: ChatRoom,
          as: 'chatRoom',
          include: [{
            model: ChatRoomMember,
            as: 'members',
            where: { user_id, role: 'owner' },
            required: true
          }]
        }],
        transaction
      });

      if (!parentTeam) {
        await transaction.rollback();
        return res.status(403).json({ message: '仅父团队的组长可创建子团队' });
      }

      // 敏感词检测
      const filter = getFilter();
      const result = filter.filter(team_name , { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({message : "队名含有敏感词"});
      }
      if(!description){
        const DesResult = filter.filter(description , { replace: false });
        if (DesResult.words.length > 0) {
          return res.status(422).json({message : "描述含有敏感词"});
        }
      }


      // 创建子团队
      const subTeam = await Team.create({
        team_name,
        description : "",
        parent_team_id: parentTeamId,
        is_public: 0, // 公开不可见
        grade: 'mature'
      }, { transaction });

      // 创建子团队的聊天室
      const chatRoomName = `${subTeam.team_name} 聊天室`;
      const chatRoom = await ChatRoom.create({
        type: 'team',
        name: chatRoomName,
        team_id: subTeam.team_id
      }, { transaction });

      // 设置当前用户为子团队的 owner
      await ChatRoomMember.create({
        room_id: chatRoom.room_id,
        user_id,
        role: 'owner',
        joined_at: new Date()
      }, { transaction });

      await transaction.commit();

      res.status(201).json({
        message: '子团队创建成功',
        subTeamId: subTeam.team_id,
        parentTeamId
      });
    } catch (error) {
      await transaction.rollback();
      console.error('创建子团队失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  },
  /**
   * @route DELETE /api/teams/:id/subteam/:subTeamId
   * @desc 删除子团队（仅限父团队的 owner）
   * @access Private
   */
  deleteSubTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;
    const parentTeamId = parseInt(req.params.id, 10);
    const subTeamId = parseInt(req.params.subTeamId, 10);

    try {
      if (!parentTeamId || isNaN(parentTeamId) || !subTeamId || isNaN(subTeamId)) {
        return res.status(400).json({ message: '无效的团队ID' });
      }

      // 1. 验证：当前用户是否为 parentTeam 的 owner
      const parentTeam = await Team.findOne({
        where: { team_id: parentTeamId },
        include: [{
          model: ChatRoom,
          as: 'chatRoom',
          include: [{
            model: ChatRoomMember,
            as: 'members',
            where: { user_id, role: 'owner' },
            required: true
          }]
        }],
        transaction
      });

      if (!parentTeam) {
        await transaction.rollback();
        return res.status(403).json({ message: '仅父团队的组长可删除子团队' });
      }

      // 2. 验证：subTeam 是否确实是 parentTeam 的子团队
      const subTeam = await Team.findOne({
        where: { team_id: subTeamId, parent_team_id: parentTeamId },
        include: [{
          model: ChatRoom,
          as: 'chatRoom'
        }],
        transaction
      });

      if (!subTeam) {
        await transaction.rollback();
        return res.status(404).json({ message: '子团队不存在或不属于该团队' });
      }

      // 3. 获取子团队的聊天室 ID
      const roomId = subTeam.chatRoom?.room_id;
      if (!roomId) {
        await transaction.rollback();
        return res.status(500).json({ message: '子团队聊天室缺失' });
      }

      // 4. 删除相关数据（与 deleteTeam 类似）
      await ProjectResult.destroy({ where: { team_id: subTeamId }, transaction });
      await Message.destroy({ where: { room_id: roomId }, transaction });
      await Invitation.destroy({ where: { team_id: subTeamId }, transaction });
      await TeamTag.destroy({ where: { team_id: subTeamId }, transaction });
      await ChatRoomMember.destroy({ where: { room_id: roomId }, transaction });
      await ChatRoom.destroy({ where: { room_id: roomId }, transaction });

      // 5. 更新子团队成员的 team_id（设为 null）
      const members = await ChatRoomMember.findAll({
        where: { room_id: roomId },
        attributes: ['user_id'],
        transaction
      });
      const memberIds = members.map(m => m.user_id);

      if (memberIds.length > 0) {
        await User.update(
          { team_id: null },
          { where: { id: memberIds }, transaction }
        );
      }

      // 6. 删除子团队
      await Team.destroy({ where: { team_id: subTeamId }, transaction });

      await transaction.commit();

      res.status(200).json({
        message: '子团队删除成功',
        subTeamId
      });
    } catch (error) {
      await transaction.rollback();
      console.error('删除子团队失败:', error);
      res.status(500).json({ message: '服务器错误', error: error.message });
    }
  }

};