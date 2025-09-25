import { Team, TeamTag, tags, ChatRoom, ChatRoomMember, ProjectResult, User, Invitation, Message, TeamAnnouncement } from '../config/Sequelize.js';
import { Op, sequelize } from '../config/Sequelize.js';
import { getPagination, getPagingData } from '../utils/pagination.js';
import { getFilter } from "../utils/sensitiveWordFilter.js";

const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({
    message: '服务器错误',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

const isAdmin = (req) => {
  console.log("test:", req.user);
  return req.user && req.user.is_admin === true;
};

const validateTeamOwner = async (userId, teamId, transaction) => {
  const team = await Team.findOne({
    where: { team_id: teamId },
    include: [{
      model: ChatRoom,
      as: 'chatRoom',
      include: [{
        model: ChatRoomMember,
        as: 'members',
        where: { user_id: userId, role: 'owner' },
        required: true,
      }],
      required: true
    }],
    transaction
  });
  return !!team;
};

export const teamController = {
  createTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;

    try {
      const { team_name, description, tagIds, is_public, grade, img_url } = req.body;
      if (!team_name) {
        return res.status(400).json({ message: '需要队伍名称' });
      }

      if (typeof is_public !== 'undefined' && ![0, 1].includes(Number(is_public))) {
        return res.status(400).json({ message: 'is_public 必须是 0 或 1' });
      }

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
      const result = filter.filter(team_name, { replace: false });
      if (result.words.length > 0) {
        return res.status(422).json({ message: "队名含有敏感词" });
      }
      const DesResult = filter.filter(description || '', { replace: false });
      if (DesResult.words.length > 0) {
        return res.status(422).json({ message: "描述含有敏感词" });
      }

      const newTeam = await Team.create({
        team_name,
        description,
        is_public: Number(is_public),
        grade,
        img_url
      }, { transaction });

      await User.update({ team_id: newTeam.team_id }, { where: { id: user_id }, transaction });

      const chatRoomName = `${newTeam.team_name} 聊天室`;
      const chatRoom = await ChatRoom.create({
        type: 'team',
        name: chatRoomName,
        team_id: newTeam.team_id
      }, { transaction });

      await ChatRoomMember.create({
        room_id: chatRoom.room_id,
        user_id: user_id,
        joined_at: new Date(),
        role: 'owner'
      }, { transaction });

      if (tagIds && Array.isArray(tagIds) && tagIds.length > 0) {
        const teamTagRecords = tagIds.map(tag_id => ({
          team_id: newTeam.team_id,
          tag_id,
          created_at: new Date(),
          updated_at: new Date()
        }));
        await TeamTag.bulkCreate(teamTagRecords, { transaction });
      }

      await transaction.commit();
      res.status(201).json({ message: '队伍和聊天室成功创建', team_id: newTeam.team_id });
    } catch (error) {
      await transaction.rollback();
      handleError(res, error, '创建队伍和聊天室时遇到问题');
    }
  },

  getAllTeams: async (req, res) => {
    try {
      const { page = 0, size = 10, search } = req.query;
      const { limit, offset } = getPagination(page, size);

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
        order: [['created_at', 'DESC']],
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
      handleError(res, error, '获取所有团队时出错');
    }
  },

  getAllTeamsNoPaging: async (req, res) => {
  try {
    const { team_id, team_name, page, size } = req.query;
    const limit = parseInt(size, 10) || 10;
    const offset = (parseInt(page, 10) || 0) * limit;

    const whereCondition = {
      is_public: true,
      parent_team_id: null,
    };
    if (team_id) {
      whereCondition.team_id = team_id;
    }
    if (team_name) {
      whereCondition.team_name = { [Op.like]: `%${team_name}%` };
    }

    const data = await Team.findAndCountAll({
      where: whereCondition,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
      col: 'team_id',
      include: [
        {
          model: tags,
          as: 'tags',
          attributes: ['tag_id', 'tag_name'],
          through: { attributes: [] },
          required: false,
        },
        {
          model: ChatRoom,
          as: 'chatRoom',
          attributes: ['room_id'],
          required: false,
          include: [
            {
              model: ChatRoomMember,
              as: 'members',
              attributes: ['user_id', 'role'],
              required: false,
              include: [
                {
                  model: User,
                  as: 'member',
                  attributes: ['id', 'name', 'avatar_key'],
                  required: false,
                },
              ],
            },
          ],
        },
        {
          model: ProjectResult,
          as: 'projectResults',
          attributes: ['result_id', 'type', 'is_completed', 'completed_at'],
          required: false,
        },
      ],
    });

    const teamsWithDetails = data.rows.map((team) => {
      const chatRoomMembers = team.chatRoom?.members || [];
      const captain = chatRoomMembers.find((member) => member.role === 'captain')?.member;
      const members = chatRoomMembers.filter((member) => member.role !== 'captain');
      return {
        ...team.toJSON(),
        captain,
        members,
        chatRoom: undefined,
      };
    });

    res.status(200).json({
      rows: teamsWithDetails,
      total: data.count,
    });
  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({ message: '服务器内部错误', error: error.message });
  }
  },

  getMyTeam: async (req, res) => {
    const user_id = req.user.userId;

    try {
      const user = await User.findOne({
        where: { id: user_id },
        attributes: ['id', 'team_id'],
      });

      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      if (user.team_id === null) {
        return res.status(200).json({ 
          message: '您当前未加入任何队伍', 
          team_info: null 
        });
      }

      const team_id = user.team_id;

      const team = await Team.findOne({
        where: { team_id: team_id },
        attributes: [
          'team_id',
          'team_name',
          'description',
          'is_public',
          'grade',
          'img_url',
          'created_at',
          'updated_at'
        ]
      });

      if (!team) {
        return res.status(404).json({ message: '队伍不存在或已解散' });
      }

      return res.status(200).json({ 
        message: '成功获取您的队伍信息', 
        team_info: team.toJSON() 
      });

    } catch (error) {
      handleError(res, error, '获取队伍信息时遇到问题');
    }
  },

  getTeamById: async (req, res) => {
    try {
      const { id } = req.params;

      const team = await Team.findByPk(id, {
        include: [
          { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] }, required: false },
          { model: ProjectResult, as: 'projectResults', required: false, attributes: ['result_id', 'team_id', 'type', 'is_completed', 'completed_at', [sequelize.literal(`CASE WHEN projectResults.type = 'article' THEN projectResults.post_id ELSE NULL END`), 'post_id']] },
          {
            model: ChatRoom, as: 'chatRoom', attributes: ['room_id', 'name'], include: [{
              model: ChatRoomMember, as: 'members', attributes: ['user_id', 'role', 'joined_at'], include: [{ model: User, as: 'member', attributes: ['id', 'name', 'avatar_key'] }]
            }]
          },
          {
            model: Team, as: 'subTeams', attributes: ['team_id', 'team_name', 'description', 'created_at', 'grade', 'is_public'],
            include: [
              { model: tags, as: 'tags', attributes: ['tag_id', 'tag_name'], through: { attributes: [] }, required: false },
              { model: ChatRoom, as: 'chatRoom', required: false }
            ],
            required: false
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

      if (teamData.subTeams) {
        teamData.subTeams.forEach(sub => {
          if (sub.tags && sub.tags.length > 3) {
            sub.tags = sub.tags.slice(0, 3);
          }
        });
      }

      res.status(200).json(teamData);
    } catch (error) {
      handleError(res, error, '获取团队信息时出错');
    }
  },

  updateTeam: async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      const isCurrentUserAdmin = isAdmin(req);
      if (!isCurrentUserAdmin && !await validateTeamOwner(currentUserId, id, transaction)) {
        await transaction.rollback();
        return res.status(403).json({ message: '无权更新此团队' });
      }

      const { team_name, description, is_public, grade, img_url, tag_ids } = req.body;
      const updateFields = {};
      if (team_name !== undefined) updateFields.team_name = team_name;
      if (description !== undefined) updateFields.description = description;
      if (is_public !== undefined) updateFields.is_public = is_public;
      if (grade !== undefined) updateFields.grade = grade;
      if (img_url !== undefined) updateFields.img_url = img_url;

      if (Object.keys(updateFields).length === 0 && tag_ids === undefined) {
        return res.status(400).json({ message: 'No fields to update.' });
      }
      
      const filter = getFilter();
      if (team_name) {
          const result = filter.filter(team_name, { replace: false });
          if (result.words.length > 0) {
              await transaction.rollback();
              return res.status(422).json({ message: "队名含有敏感词" });
          }
      }
      if (description) {
          const DesResult = filter.filter(description, { replace: false });
          if (DesResult.words.length > 0) {
              await transaction.rollback();
              return res.status(422).json({ message: "描述含有敏感词" });
          }
      }

      if (Object.keys(updateFields).length > 0) {
        const [updatedCount] = await Team.update(updateFields, {
          where: { team_id: id },
          transaction
        });
        if (updatedCount === 0) {
          await transaction.rollback();
          return res.status(404).json({ message: 'Team not found or no changes made.' });
        }
      }

      if (tag_ids !== undefined) {
        if (!Array.isArray(tag_ids)) {
          await transaction.rollback();
          return res.status(400).json({ message: 'tag_ids must be an array.' });
        }
        await TeamTag.destroy({ where: { team_id: id }, transaction });
        if (tag_ids.length > 0) {
          const teamTagRecords = tag_ids.map(tag_id => ({ team_id: id, tag_id }));
          await TeamTag.bulkCreate(teamTagRecords, { transaction });
        }
      }

      await transaction.commit();
      const updatedTeam = await Team.findByPk(id, { include: [{ model: tags, as: 'tags', through: { attributes: [] } }] });
      res.status(200).json({ message: 'Team updated successfully.', team: updatedTeam });
    } catch (error) {
      await transaction.rollback();
      handleError(res, error, '更新团队时出错');
    }
  },

  deleteTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    try {
      const { id } = req.params;
      const currentUserId = req.user.userId;

      const isCurrentUserAdmin = isAdmin(req);
      if (!isCurrentUserAdmin && !await validateTeamOwner(currentUserId, id, transaction)) {
        await transaction.rollback();
        return res.status(403).json({ message: '无权删除此团队或团队不存在' });
      }

      const allTeamIds = new Set();
      const collectSubTeams = async (parentId) => {
        const subTeams = await Team.findAll({ where: { parent_team_id: parentId }, attributes: ['team_id'], transaction });
        for (const subTeam of subTeams) {
          allTeamIds.add(subTeam.team_id);
          await collectSubTeams(subTeam.team_id);
        }
      };

      allTeamIds.add(Number(id));
      await collectSubTeams(id);
      const teamIdsArray = Array.from(allTeamIds);

      const chatRooms = await ChatRoom.findAll({ where: { team_id: teamIdsArray }, attributes: ['room_id'], transaction });
      const roomIds = chatRooms.map(cr => cr.room_id);

      await TeamAnnouncement.destroy({ where: { team_id: teamIdsArray }, transaction });
      await ProjectResult.destroy({ where: { team_id: teamIdsArray }, transaction });
      await Invitation.destroy({ where: { team_id: teamIdsArray }, transaction });
      await TeamTag.destroy({ where: { team_id: teamIdsArray }, transaction });
      await Message.destroy({ where: { room_id: roomIds }, transaction });

      const memberIds = (await ChatRoomMember.findAll({ where: { room_id: roomIds }, attributes: ['user_id'], transaction })).map(m => m.user_id);
      if (memberIds.length > 0) {
        await User.update({ team_id: null }, { where: { id: memberIds }, transaction });
      }

      await ChatRoomMember.destroy({ where: { room_id: roomIds }, transaction });
      await ChatRoom.destroy({ where: { room_id: roomIds }, transaction });
      await Team.destroy({ where: { team_id: teamIdsArray }, transaction });

      await transaction.commit();
      res.status(204).send();

    } catch (error) {
      await transaction.rollback();
      handleError(res, error, '删除团队失败');
    }
  },

  createSubTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;
    const parentTeamId = parseInt(req.params.id, 10);

    try {
      if (isNaN(parentTeamId)) {
        return res.status(400).json({ message: '无效的父团队ID' });
      }

      const isCurrentUserAdmin = isAdmin(req);
      if (!isCurrentUserAdmin && !await validateTeamOwner(user_id, parentTeamId, transaction)) {
        await transaction.rollback();
        return res.status(403).json({ message: '仅父团队的组长或管理员可创建子团队' });
      }

      const { team_name, description = "" } = req.body;
      if (!team_name) {
        return res.status(400).json({ message: '需要队伍名称' });
      }
      
      const filter = getFilter();
      const nameResult = filter.filter(team_name, { replace: false });
      if (nameResult.words.length > 0) {
          return res.status(422).json({ message: "队名含有敏感词" });
      }
      const descResult = filter.filter(description, { replace: false });
      if (descResult.words.length > 0) {
          return res.status(422).json({ message: "描述含有敏感词" });
      }

      const subTeam = await Team.create({
        team_name,
        description,
        parent_team_id: parentTeamId,
        is_public: 0,
        grade: 'mature'
      }, { transaction });

      const chatRoomName = `${subTeam.team_name} 聊天室`;
      const chatRoom = await ChatRoom.create({
        type: 'team',
        name: chatRoomName,
        team_id: subTeam.team_id
      }, { transaction });

      await ChatRoomMember.create({
        room_id: chatRoom.room_id,
        user_id,
        role: 'owner',
        joined_at: new Date()
      }, { transaction });

      await transaction.commit();
      res.status(201).json({ message: '子团队创建成功', subTeamId: subTeam.team_id, parentTeamId });
    } catch (error) {
      await transaction.rollback();
      handleError(res, error, '创建子团队失败');
    }
  },

  deleteSubTeam: async (req, res) => {
    const transaction = await Team.sequelize.transaction();
    const user_id = req.user.userId;
    const parentTeamId = parseInt(req.params.id, 10);
    const subTeamId = parseInt(req.params.subTeamId, 10);

    try {
      if (isNaN(parentTeamId) || isNaN(subTeamId)) {
        return res.status(400).json({ message: '无效的团队ID' });
      }

      const isCurrentUserAdmin = isAdmin(req);
      if (!isCurrentUserAdmin && !await validateTeamOwner(user_id, parentTeamId, transaction)) {
        await transaction.rollback();
        return res.status(403).json({ message: '仅父团队的组长或管理员可删除子团队' });
      }

      const subTeam = await Team.findOne({
        where: { team_id: subTeamId, parent_team_id: parentTeamId },
        include: [{ model: ChatRoom, as: 'chatRoom' }],
        transaction
      });

      if (!subTeam) {
        await transaction.rollback();
        return res.status(404).json({ message: '子团队不存在或不属于该团队' });
      }

      const roomId = subTeam.chatRoom?.room_id;
      if (!roomId) {
        await transaction.rollback();
        return res.status(500).json({ message: '子团队聊天室缺失' });
      }

      await ProjectResult.destroy({ where: { team_id: subTeamId }, transaction });
      await Message.destroy({ where: { room_id: roomId }, transaction });
      await Invitation.destroy({ where: { team_id: subTeamId }, transaction });
      await TeamTag.destroy({ where: { team_id: subTeamId }, transaction });
      await ChatRoomMember.destroy({ where: { room_id: roomId }, transaction });

      const members = await ChatRoomMember.findAll({ where: { room_id: roomId }, attributes: ['user_id'], transaction });
      const memberIds = members.map(m => m.user_id);
      if (memberIds.length > 0) {
        await User.update({ team_id: null }, { where: { id: memberIds }, transaction });
      }

      await ChatRoom.destroy({ where: { room_id: roomId }, transaction });
      await Team.destroy({ where: { team_id: subTeamId }, transaction });

      await transaction.commit();
      res.status(200).json({ message: '子团队删除成功', subTeamId });
    } catch (error) {
      await transaction.rollback();
      handleError(res, error, '删除子团队失败');
    }
  }
};