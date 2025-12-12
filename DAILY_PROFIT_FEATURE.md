# 每日盈亏功能说明

## 功能概述

为每个投资方向添加每日盈亏数据存储和定时计算功能，确保数据准确性和历史追溯能力。

## 数据库模型

### DirectionDailyProfit（投资方向每日盈亏）

- `id` - 记录 ID
- `directionId` - 所属投资方向 ID
- `date` - 日期（只保留日期部分）
- `dailyProfit` - 每日盈亏金额
- `cumulativeProfit` - 累计盈亏金额
- `cumulativeProfitRate` - 累计收益率（百分比）
- `totalInvested` - 累计投入金额
- `currentValue` - 当前市值
- `createdAt` - 创建时间
- `updatedAt` - 更新时间

**唯一索引：** `(directionId, date)` - 确保每个投资方向每天只有一条记录

## API 接口

### 1. 获取每日盈亏数据

**GET** `/api/investment-directions/[id]/daily-profit?days=30`

- `days`: 查询天数（默认 30 天）
- 返回指定天数内的每日盈亏数据

### 2. 手动触发计算每日盈亏

**POST** `/api/investment-directions/calculate-daily-profit`

请求体（可选）：

```json
{
  "date": "2025-12-13"  // 可选，不指定则使用今天
}
```

用于：

- 手动触发计算
- 补历史数据

### 3. 定时任务 API

**POST** `/api/cron/daily-profit-calculation`

功能：

1. 更新所有基金的净值
2. 更新所有投资方向的实际投入金额
3. 计算并保存所有投资方向的每日盈亏数据

**安全：** 建议设置 `CRON_SECRET` 环境变量，API 会验证 `Authorization: Bearer ${CRON_SECRET}` 头

## 定时任务设置

### 方式 1：使用 cron（推荐）

在服务器上设置 cron 任务，每天执行一次：

```bash
# 编辑crontab
crontab -e

# 添加以下行（每天凌晨2点执行）
0 2 * * * curl -X POST http://localhost:3000/api/cron/daily-profit-calculation -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 方式 2：使用外部调度服务

可以使用以下服务：

- **GitHub Actions** - 设置定时 workflow
- **Vercel Cron** - 如果部署在 Vercel
- **EasyCron** - 在线 cron 服务
- **PM2 Cron** - 如果使用 PM2

### 方式 3：使用 node-cron（开发环境）

在项目中安装 `node-cron`：

```bash
npm install node-cron
```

创建 `scripts/cron.ts`：

```typescript
import cron from 'node-cron';
import fetch from 'node-fetch';

// 每天凌晨2点执行
cron.schedule('0 2 * * *', async () => {
  const cronSecret = process.env.CRON_SECRET;
  const url = `${process.env.NEXTAUTH_URL}/api/cron/daily-profit-calculation`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    });
    const result = await response.json();
    console.log('定时任务执行结果:', result);
  } catch (error) {
    console.error('定时任务执行失败:', error);
  }
});
```

## 数据库迁移

### 方法 1：使用 Prisma Migrate（推荐）

```bash
npx prisma migrate dev --name add_direction_daily_profit
```

### 方法 2：直接执行 SQL

如果 migrate 有问题，可以直接执行 SQL 文件：

```bash
mysql -u用户名 -p数据库名 < prisma/migrations/20251213000000_add_direction_daily_profit/migration.sql
```

或者手动执行：

```sql
-- 创建表
CREATE TABLE `DirectionDailyProfit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `dailyProfit` DECIMAL(15, 2) NOT NULL,
    `cumulativeProfit` DECIMAL(15, 2) NOT NULL,
    `cumulativeProfitRate` DECIMAL(10, 4) NOT NULL,
    `totalInvested` DECIMAL(15, 2) NOT NULL,
    `currentValue` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `DirectionDailyProfit_directionId_date_key` (`directionId`, `date`),
    KEY `DirectionDailyProfit_directionId_idx` (`directionId`),
    KEY `DirectionDailyProfit_date_idx` (`date`),
    CONSTRAINT `DirectionDailyProfit_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 补历史数据

如果需要补历史数据，可以调用手动计算 API：

```bash
# 补最近30天的数据
for i in {0..29}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  curl -X POST http://localhost:3000/api/investment-directions/calculate-daily-profit \
    -H "Content-Type: application/json" \
    -d "{\"date\": \"$date\"}"
done
```

## 环境变量

在 `.env` 文件中添加：

```env
# 定时任务密钥（可选，但推荐设置）
CRON_SECRET=your-secret-key-here
```

## 注意事项

1. **数据一致性**：每日盈亏数据基于当天的净值快照计算，确保净值已更新
2. **时区问题**：使用服务器时区，确保定时任务在正确时间执行
3. **错误处理**：定时任务会记录失败的投资方向，需要定期检查
4. **性能优化**：如果投资方向很多，可以考虑分批处理
