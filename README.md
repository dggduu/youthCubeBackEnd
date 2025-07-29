## youthCube 的后端服务
### ToDoList
- [x] 邮件验证服务
- [x] 邮件找回密码
- [x] 行为验证码生成接口（基于svg-captcha）
- [x] db 封装（Sequelize）
- [x] 登录鉴权(jwt)
- [x] minio下载接口（分片+小文件上传）
- [x] 消息接口（socket.io）+ 云端存储部分
- [x] 团队创建接口
- [x] 邀请接口
- [x] 敏感词检测(先不做base64编码，方便后期添加)
- [ ] AI 接口鉴权与限流（有待商榷）

- [ ] 团队授权
- [ ] 支持多个队伍
### SpecialThanks
- mint-filter : https://www.npmjs.com/package/mint-filter
- 整理了较为好用的敏感词词库 ：https://github.com/57ing/Sensitive-word