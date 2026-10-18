# 设计

- `StrategyAccount.qiemanBearerToken` 保存账户级 Token，仅服务端读取。
- 策略账户 GET 返回 `qiemanTokenConfigured`，不返回 Token；PATCH 支持保存或清除当前账户 Token。
- 且慢同步接口按账户读取 Token，并继续支持该账户的多个 `userPropertyId`。
- 系统设置删除全局且慢 Token 卡片；已有历史持仓与账户标识不变。
