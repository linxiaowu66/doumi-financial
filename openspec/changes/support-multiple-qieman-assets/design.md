# 设计

- `StrategyAccount.qiemanUserPropertyIds` 保存 JSON 数组；`qiemanUserPropertyId` 保留为第一标识兼容字段。
- 同步接口对数组中的每个标识调用且慢官方接口，按基金代码和资产大类合并市值，并按合并后的总资产重新计算占比。
- 原始响应按子账户完整保存到 `StrategyAccountImport.rawJson`，同日期持仓快照幂等替换。
- 策略中枢允许输入多个 ID 或资产页 URL，逗号、空格或换行分隔。
