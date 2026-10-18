# 设计

- `SystemSetting` 保存 `qieman_bearer_token`；系统设置 GET 只返回是否已配置，绝不返回明文 Token。
- `/api/strategy-accounts/sync-qieman` 从服务端系统设置读取 Token。
- 策略账户接口支持更新单个 Qieman `userPropertyId`，策略中枢为两个账户分别提供绑定和同步入口。
- 删除截图上传、AI 识别预览和截图持仓写入入口；已存在的历史快照保留在数据库中。
