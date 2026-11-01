# 设计

- 使用且慢接口汇总后的 `totalAsset` 更新关联 `HouseholdAsset.balance` 和 `asOfDate`。
- 按净值日期写入或更新该账户的月度余额历史。
- 与持仓快照放在同一 Prisma 事务中，任一部分失败都不报告同步成功。
