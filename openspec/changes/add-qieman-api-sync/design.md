# 设计

- `StrategyAccount.qiemanUserPropertyId` 保存且慢网页的 `userPropertyId`。
- 新增服务端同步接口，先获取长赢元数据得到 `capitalAccountId`，再获取资产汇总。
- 服务端按且慢的 `classCode` 映射到系统大类，并按净值日期写入 `StrategyAccountHolding`。
- 每次同步生成 `StrategyAccountImport(sourceType=QIEMAN_API)`，同日期快照幂等替换。
- UI 提供手动同步按钮；每月 1 号由用户点击一次，后续再接自动任务。
