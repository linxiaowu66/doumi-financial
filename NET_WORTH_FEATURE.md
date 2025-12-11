# 净值存储功能说明

## 功能概述

已完成基金净值自动保存到数据库的功能，每次获取最新净值时会自动存储，并显示净值日期和更新时间。

## 数据库变更

### Fund 表新增字段

```prisma
model Fund {
  // ... 其他字段
  latestNetWorth    Decimal?   @db.Decimal(10, 4)  // 最新净值
  netWorthDate      String?                         // 净值日期（如：2025-12-10）
  netWorthUpdateAt  DateTime?                       // 净值更新时间
}
```

## API 接口

### 1. 更新基金净值

**接口**: `PUT /api/funds/[id]/net-worth`

**请求参数**:

```json
{
  "netWorth": "1.6037",
  "netWorthDate": "2025-12-10"
}
```

**响应**:

```json
{
  "id": 5,
  "code": "008809",
  "name": "安信民稳增长混合A",
  "latestNetWorth": 1.6037,
  "netWorthDate": "2025-12-10",
  "netWorthUpdateAt": "2025-12-11T03:05:45.076Z",
  ...
}
```

## 前端功能

### 1. 自动获取和保存

- 打开基金详情页时，先显示数据库中缓存的净值
- 然后自动调用天天基金 API 获取最新净值
- 获取成功后自动保存到数据库

### 2. 净值信息显示

在"持仓统计"卡片右上角显示：

```
当前净值: [1.6037] [获取最新] [刷新]
净值日期：2025-12-10 (更新于 12-11 11:05)
```

### 3. 手动操作

- **手动输入**: 可以直接修改净值输入框
- **获取最新**: 点击按钮从天天基金获取最新净值
- **刷新**: 使用当前净值重新计算收益数据

## 业务逻辑

### 净值更新流程

1. 页面加载 → 显示数据库缓存净值（如有）
2. 判断是否需要更新：
   - 从未更新过（netWorthUpdateAt = null）→ 需要更新 ✅
   - 上次更新不是今天 → 需要更新 ✅
   - 上次更新是今天 → 跳过更新 ❌
3. 如果需要更新 → 自动调用 API 获取最新净值（异步）
4. 获取成功 → 更新显示 + 保存数据库
5. 显示净值日期和更新时间

### 智能更新策略

```typescript
const shouldUpdateNetWorth = (lastUpdateTime: string | null | undefined): boolean => {
  if (!lastUpdateTime) {
    return true; // 从未更新过，需要获取
  }

  const lastUpdate = dayjs(lastUpdateTime);
  const now = dayjs();

  // 如果上次更新不是今天，需要重新获取
  return !lastUpdate.isSame(now, 'day');
};
```

### 优势

- **减少 API 调用**：同一天内多次访问不会重复获取
- **提升性能**：页面加载更快，无需等待不必要的 API 请求
- **数据一致性**：同一天内使用相同净值，符合基金更新规律
- **灵活性**：用户可随时手动点击"获取最新"强制刷新

### 净值日期说明

- 对于美股 ETF 基金，净值通常是 T-1 的（前一天）
- 天天基金 API 返回的 `netWorthDate` 字段会标明净值的日期
- 系统会同时记录从 API 获取数据的时间 (`netWorthUpdateAt`)

## 使用场景

### 场景 1：每日首次查看

用户今天第一次打开基金详情页：

- 显示昨天缓存的净值（秒开）
- 检测到不是今天更新的 → 自动获取今天最新净值
- 系统显示"净值日期：2025-12-10"提示用户这是哪天的净值

### 场景 2：同一天多次查看

用户今天已经访问过该基金：

- 显示今天缓存的净值（秒开）
- 检测到已是今天更新的 → 跳过自动获取
- 控制台输出"净值已是最新，无需重复获取"
- 减少 API 调用，提升性能

### 场景 3：离线查看

如果网络不好或 API 失败：

- 仍然可以看到上次缓存的净值
- 可以手动输入净值进行计算

### 场景 4：手动刷新

用户想确认最新数据：

- 点击"获取最新"按钮
- 无论何时都会强制获取最新净值
- 系统重新获取并更新净值
- 显示最新的净值日期和更新时间

## 测试方法

### 1. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
pnpm dev
```

### 2. 测试 API

```bash
# 更新净值
curl -X PUT "http://localhost:3000/api/funds/5/net-worth" \
  -H "Content-Type: application/json" \
  -d '{"netWorth": "1.6037", "netWorthDate": "2025-12-10"}'

# 查看结果
curl "http://localhost:3000/api/funds/5" | jq '{latestNetWorth, netWorthDate, netWorthUpdateAt}'
```

### 3. 测试前端

1. 访问基金详情页: http://localhost:3000/funds/5
2. 观察净值是否自动加载
3. 点击"获取最新"按钮
4. 检查是否显示净值日期和更新时间

## 完成状态

✅ 数据库 schema 更新
✅ Prisma Client 生成
✅ API 接口创建
✅ 前端集成
⏳ 等待服务器重启后测试
