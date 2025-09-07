/*
 Navicat Premium Dump SQL

 Source Server         : wslMysql
 Source Server Type    : PostgreSQL
 Source Server Version : 150000
 Source Host           : localhost:5432
 Source Schema         : youthCube

 Target Server Type    : PostgreSQL
 Target Server Version : 150000
 File Encoding         : 65001

 Date: 06/09/2025 19:41:16
*/

-- 创建枚举类型
CREATE TYPE chat_member_role AS ENUM ('owner', 'co_owner', 'member');
CREATE TYPE chat_room_type AS ENUM ('team', 'private');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
CREATE TYPE like_target_type AS ENUM ('post', 'comment');
CREATE TYPE progress_timeline_type AS ENUM ('meeting', 'deadline', 'competition', 'progress_report');
CREATE TYPE progress_status AS ENUM ('pending', 'accept', 'reject');
CREATE TYPE result_type AS ENUM ('article', 'manual');
CREATE TYPE announcement_status AS ENUM ('active', 'deleted');

-- 创建表
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  birth_date DATE NOT NULL,
  learn_stage VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  sex VARCHAR(10) NULL,
  avatar_key TEXT NULL,
  bio TEXT NULL,
  team_id SMALLINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_member BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS teams CASCADE;
CREATE TABLE teams (
  team_id SERIAL PRIMARY KEY,
  team_name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  create_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  grade VARCHAR(50) NOT NULL DEFAULT 'mature',
  parent_team_id INT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  img_url TEXT NULL,
  CONSTRAINT fk_parent_team_id FOREIGN KEY (parent_team_id) REFERENCES teams(team_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_team_name ON teams(team_name);
CREATE INDEX idx_parent_team_id ON teams(parent_team_id);

DROP TABLE IF EXISTS tags CASCADE;
CREATE TABLE tags (
  tag_id SERIAL PRIMARY KEY,
  tag_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS posts CASCADE;
CREATE TABLE posts (
  post_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT NULL,
  location VARCHAR(100) NULL,
  views_count INT NOT NULL DEFAULT 0,
  likes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  collected_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_posts_user ON posts(user_id);

DROP TABLE IF EXISTS post_media CASCADE;
CREATE TABLE post_media (
  media_id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(100) NOT NULL DEFAULT 'image',
  order_index INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON UPDATE RESTRICT ON DELETE CASCADE
);

CREATE INDEX idx_post_media_post ON post_media(post_id);

DROP TABLE IF EXISTS post_tags CASCADE;
CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, tag_id),
  CONSTRAINT fk_post_tags_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_post_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);

DROP TABLE IF EXISTS comments CASCADE;
CREATE TABLE comments (
  comment_id SERIAL PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_comment_id INT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comments_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES comments(comment_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);

DROP TABLE IF EXISTS likes CASCADE;
CREATE TABLE likes (
  like_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  target_id INT NOT NULL,
  target_type like_target_type NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (user_id, target_id, target_type)
);

DROP TABLE IF EXISTS collections CASCADE;
CREATE TABLE collections (
  collection_id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  post_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_collections_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_collections_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (user_id, post_id)
);

CREATE INDEX idx_collections_post ON collections(post_id);

DROP TABLE IF EXISTS team_user CASCADE;
CREATE TABLE team_user (
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  CONSTRAINT fk_team_user_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_team_user_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_team_user_user ON team_user(user_id);

DROP TABLE IF EXISTS team_tags CASCADE;
CREATE TABLE team_tags (
  team_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (team_id, tag_id),
  CONSTRAINT fk_team_tags_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_team_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_team_tags_tag ON team_tags(tag_id);

DROP TABLE IF EXISTS invitations CASCADE;
CREATE TABLE invitations (
  invitation_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  invited_by INT NOT NULL,
  user_id INT NULL,
  description TEXT NOT NULL,
  email VARCHAR(255) NULL,
  status invitation_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  CONSTRAINT fk_invitations_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_invited_by FOREIGN KEY (invited_by) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_invitations_team ON invitations(team_id);
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX idx_invitations_user ON invitations(user_id);

DROP TABLE IF EXISTS friend_invitations CASCADE;
CREATE TABLE friend_invitations (
  invitation_id SERIAL PRIMARY KEY,
  inviter_id INT NOT NULL,
  invitee_id INT NULL,
  email VARCHAR(255) NULL,
  status invitation_status DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  CONSTRAINT fk_friend_inviter FOREIGN KEY (inviter_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_friend_invitee FOREIGN KEY (invitee_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  UNIQUE (inviter_id, invitee_id, email)
);

CREATE INDEX idx_friend_inviter ON friend_invitations(inviter_id);
CREATE INDEX idx_friend_invitee ON friend_invitations(invitee_id);
CREATE INDEX idx_friend_email ON friend_invitations(email);

DROP TABLE IF EXISTS chat_rooms CASCADE;
CREATE TABLE chat_rooms (
  room_id SERIAL PRIMARY KEY,
  type chat_room_type NOT NULL,
  name VARCHAR(255) NULL,
  team_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_rooms_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_chat_rooms_team ON chat_rooms(team_id);

DROP TABLE IF EXISTS chat_room_members CASCADE;
CREATE TABLE chat_room_members (
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role chat_member_role NOT NULL DEFAULT 'member',
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT fk_chat_room_members_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_chat_room_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_chat_room_members_user ON chat_room_members(user_id);

DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
  message_id SERIAL PRIMARY KEY,
  room_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_messages_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_messages_room ON messages(room_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);

DROP TABLE IF EXISTS private_chats CASCADE;
CREATE TABLE private_chats (
  user1_id INT NOT NULL,
  user2_id INT NOT NULL,
  room_id INT NOT NULL UNIQUE,
  PRIMARY KEY (user1_id, user2_id),
  CONSTRAINT fk_private_chats_user1 FOREIGN KEY (user1_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_private_chats_user2 FOREIGN KEY (user2_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_private_chats_room FOREIGN KEY (room_id) REFERENCES chat_rooms(room_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CHECK (user1_id < user2_id)
);

CREATE INDEX idx_private_chats_user2 ON private_chats(user2_id);

DROP TABLE IF EXISTS team_progress CASCADE;
CREATE TABLE team_progress (
  progress_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  timeline_type progress_timeline_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  status progress_status NOT NULL DEFAULT 'pending',
  submit_user_id INT NOT NULL,
  content TEXT NOT NULL,
  event_time TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_team_progress_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_team_progress_user FOREIGN KEY (submit_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_team_progress_team ON team_progress(team_id);
CREATE INDEX idx_team_progress_user ON team_progress(submit_user_id);

DROP TABLE IF EXISTS progress_media CASCADE;
CREATE TABLE progress_media (
  media_id SERIAL PRIMARY KEY,
  progress_id INT NOT NULL,
  media_url TEXT NOT NULL,
  media_type VARCHAR(100) NOT NULL DEFAULT 'image',
  order_index INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_progress_media_progress FOREIGN KEY (progress_id) REFERENCES team_progress(progress_id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_progress_media_progress ON progress_media(progress_id);

DROP TABLE IF EXISTS progress_comments CASCADE;
CREATE TABLE progress_comments (
  comment_id SERIAL PRIMARY KEY,
  progress_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_comment_id INT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_progress_comments_progress FOREIGN KEY (progress_id) REFERENCES team_progress(progress_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_progress_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_progress_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES progress_comments(comment_id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX idx_progress_comments_progress ON progress_comments(progress_id);
CREATE INDEX idx_progress_comments_user ON progress_comments(user_id);
CREATE INDEX idx_progress_comments_parent ON progress_comments(parent_comment_id);

DROP TABLE IF EXISTS project_results CASCADE;
CREATE TABLE project_results (
  result_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  type result_type NOT NULL,
  post_id INT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP NULL,
  CONSTRAINT fk_project_results_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  CONSTRAINT fk_project_results_post FOREIGN KEY (post_id) REFERENCES posts(post_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_project_results_team ON project_results(team_id);
CREATE INDEX idx_project_results_post ON project_results(post_id);

DROP TABLE IF EXISTS refresh_tokens CASCADE;
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  refresh_token VARCHAR(512) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

DROP TABLE IF EXISTS team_announcements CASCADE;
CREATE TABLE team_announcements (
  announcement_id SERIAL PRIMARY KEY,
  team_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_pinned BOOLEAN DEFAULT FALSE,
  status announcement_status DEFAULT 'active',
  CONSTRAINT fk_announcement_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_announcement_user FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX idx_announcement_team ON team_announcements(team_id);
CREATE INDEX idx_announcement_created_by ON team_announcements(created_by);
CREATE INDEX idx_announcement_created_at ON team_announcements(created_at);

DROP TABLE IF EXISTS thought_bullets CASCADE;
CREATE TABLE thought_bullets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_thought_bullets_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX idx_thought_bullets_user ON thought_bullets(user_id);
CREATE INDEX idx_thought_bullets_created_at ON thought_bullets(created_at);

DROP TABLE IF EXISTS user_follows CASCADE;
CREATE TABLE user_follows (
  follow_id SERIAL PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_user_follows_following FOREIGN KEY (following_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  UNIQUE (follower_id, following_id)
);

CREATE INDEX idx_user_follows_following ON user_follows(following_id);

-- 添加外键约束（部分在创建表时已添加，这里补充可能遗漏的）
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(team_id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 创建更新触发器函数（用于自动更新updated_at字段）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新updated_at的表创建触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_rooms_updated_at BEFORE UPDATE ON chat_rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_friend_invitations_updated_at BEFORE UPDATE ON friend_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_progress_updated_at BEFORE UPDATE ON team_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_media_updated_at BEFORE UPDATE ON progress_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_comments_updated_at BEFORE UPDATE ON progress_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_team_announcements_updated_at BEFORE UPDATE ON team_announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_thought_bullets_updated_at BEFORE UPDATE ON thought_bullets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();