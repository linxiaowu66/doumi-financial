## Design

1. HouseholdAssetPolicy 保存家庭层约束，配置比例使用 JSON 保存并在 API 层验证总和为 100%。
2. StrategyAccount 与 HouseholdAsset 关联；StrategyAccountHolding 记录某一快照日的成分基金和市值，StrategyAccountImport 保存批量导入的原始结构化结果和文件名。
3. 截图识别在浏览器调用用户配置的 AI 服务，只返回可见内容；用户确认后才持久化成分数据。
4. 回测使用历史净值在 T-1 计算信号、下一净值点执行，并显式扣除买卖费；结果包含收益、最大回撤、换手和交易次数。
5. 基金信号的目标缺口使用分类当前市值，避免上涨或下跌导致成本口径失真。
