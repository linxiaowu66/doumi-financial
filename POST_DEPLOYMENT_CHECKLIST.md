# 部署后检查清单

当代码部署到线上后，如果发现数据为空（如"实际投入"显示为 0），请按以下步骤检查和修复：

## 🔍 问题诊断

线上环境数据为空通常是因为：

1. **数据库迁移未执行** - 新表（如 `DirectionDailyProfit`）未创建
2. **Prisma Client 未重新生成** - 代码使用了新的模型但 Client 未更新
3. **实际投入金额未重新计算** - 线上数据库的 `actualAmount` 字段可能还是初始值 0

---

## ✅ 部署后必须执行的步骤

### 步骤 1: 应用数据库迁移

```bash
# SSH 连接到生产服务器
ssh user@your-server

# 进入项目目录
cd /path/to/doumi-financial

# 应用所有未执行的数据库迁移
pnpm prisma migrate deploy
```

**预期输出：**

```
Applying migration `20251213000000_add_direction_daily_profit`
The following migration(s) have been applied:
  - 20251213000000_add_direction_daily_profit
```

### 步骤 2: 重新生成 Prisma Client

```bash
# 生成 Prisma Client（确保包含最新的模型）
pnpm prisma generate
```

### 步骤 3: 重新计算实际投入金额（仅首次部署需要）

> **⚠️ 重要说明：**
>
> 这个步骤**只在首次部署或数据修复时需要执行一次**。之后系统会根据你的买入/卖出交易**自动更新**实际投入金额。
>
> 系统已在以下场景自动更新：
>
> - ✅ 创建买入交易时
> - ✅ 更新交易记录时
> - ✅ 删除交易记录时
> - ✅ 执行计划买入时

如果线上数据库的 `actualAmount` 字段还是初始值 0（历史数据未计算），需要执行一次重新计算：

#### 方式 A: 通过 API 调用（推荐）

```bash
# 调用重新计算 API
curl -X POST https://your-domain.com/api/investment-directions/recalculate-actual-amount
```

或者在浏览器中访问：

```
https://your-domain.com/api/investment-directions/recalculate-actual-amount
```

**预期响应：**

```json
{
  "message": "重新计算完成：成功 3 个，失败 0 个",
  "results": [
    { "directionId": 1, "success": true },
    { "directionId": 2, "success": true },
    { "directionId": 3, "success": true }
  ]
}
```

**执行后，后续的所有买入/卖出操作都会自动更新实际投入金额，无需再次手动调用此 API。**

#### 方式 B: 手动执行（如果 API 不可用）

```bash
# 进入 Node.js REPL
node

# 执行以下代码
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recalculate() {
  const directions = await prisma.investmentDirection.findMany();
  for (const dir of directions) {
    const transactions = await prisma.transaction.findMany({
      where: {
        fund: { directionId: dir.id },
        type: 'BUY'
      }
    });
    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    await prisma.investmentDirection.update({
      where: { id: dir.id },
      data: { actualAmount: total }
    });
    console.log(`方向 ${dir.id} (${dir.name}): ¥${total}`);
  }
}

recalculate().then(() => process.exit(0));
```

### 步骤 4: 重启应用

```bash
# 如果使用 PM2
pm2 restart doumi-financial

# 或如果使用其他进程管理器
# 重启你的应用服务
```

---

## 🔍 验证部署

### 1. 检查数据库表是否存在

```bash
# 连接到 MySQL
mysql -u username -p database_name

# 检查 DirectionDailyProfit 表是否存在
SHOW TABLES LIKE 'DirectionDailyProfit';

# 检查表结构
DESCRIBE DirectionDailyProfit;
```

### 2. 检查实际投入数据

```sql
-- 查看所有投资方向的实际投入
SELECT id, name, expectedAmount, actualAmount
FROM InvestmentDirection;
```

如果 `actualAmount` 还是 0，说明步骤 3 未执行或失败。

### 3. 检查迁移状态

```bash
# 查看迁移状态
pnpm prisma migrate status

# 应该显示：
# Database schema is up to date!
```

### 4. 查看已应用的迁移

```sql
-- 查看迁移历史
SELECT migration_name, finished_at
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 10;
```

应该能看到 `20251213000000_add_direction_daily_profit` 的记录。

---

## 🚨 常见问题排查

### 问题 1: 迁移执行失败

**错误信息：** `Migration failed` 或 `Table already exists`

**解决方案：**

```bash
# 查看详细错误
pnpm prisma migrate deploy --verbose

# 检查数据库连接
pnpm prisma db pull

# 如果表已存在但迁移未记录，手动标记迁移为已应用（谨慎操作）
# 仅在确认表结构正确的情况下执行
```

### 问题 2: Prisma Client 错误

**错误信息：** `Cannot read properties of undefined (reading 'findMany')` 或 `prisma.directionDailyProfit is undefined`

**解决方案：**

```bash
# 1. 重新生成 Prisma Client
pnpm prisma generate

# 2. 重启应用（必须！）
pm2 restart doumi-financial
```

### 问题 3: 实际投入仍为 0

**可能原因：**

- 步骤 3 未执行
- 交易记录不存在或 `type` 不是 `BUY`
- API 调用失败

**解决方案：**

```bash
# 1. 检查是否有交易记录
# 连接到数据库
mysql -u username -p database_name

# 查询交易记录
SELECT id, fundId, type, amount
FROM Transaction
WHERE type = 'BUY'
LIMIT 10;

# 2. 如果交易记录存在，手动调用重新计算 API
curl -X POST https://your-domain.com/api/investment-directions/recalculate-actual-amount

# 3. 检查 API 响应，确认是否成功
```

---

## 📋 快速检查清单

部署后，请确认：

- [ ] 执行了 `pnpm prisma migrate deploy`
- [ ] 执行了 `pnpm prisma generate`
- [ ] （仅首次部署）调用了重新计算实际投入的 API
- [ ] 重启了应用服务
- [ ] 验证了数据库表已创建
- [ ] 验证了实际投入数据已更新
- [ ] 检查了浏览器控制台无错误

**注意：** 步骤 3 只在首次部署时需要。之后系统会自动根据交易记录更新实际投入金额。

---

## 💡 自动化部署脚本

如果使用自动化部署（如 `deploy.sh`），确保脚本包含：

```bash
#!/bin/bash
set -e

echo "🚀 开始部署..."

# 拉取代码
git pull origin main

# 安装依赖
pnpm install

# 生成 Prisma Client
pnpm prisma generate

# 应用数据库迁移（重要！）
pnpm prisma migrate deploy

# 构建应用
pnpm build

# 重启应用
pm2 reload doumi-financial

# （可选）首次部署时，等待应用启动后调用重新计算 API
# 注意：只在首次部署或数据修复时需要，后续会自动更新
# sleep 5
# curl -X POST http://localhost:3001/api/investment-directions/recalculate-actual-amount || echo "重新计算 API 调用失败，请手动执行"

echo "✅ 部署完成！"
```

---

## 📞 需要帮助？

如果以上步骤都执行后问题仍未解决，请检查：

1. 数据库连接配置是否正确（`DATABASE_URL`）
2. 数据库用户是否有足够的权限（CREATE TABLE, ALTER TABLE）
3. 应用日志是否有错误信息
4. 浏览器控制台是否有前端错误
