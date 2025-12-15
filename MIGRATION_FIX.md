# Prisma Migration 冲突修复指南

## 🔍 问题描述

当执行 `pnpm prisma migrate deploy` 时遇到以下错误：

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251211201412_init` migration started at 2025-12-11 12:17:42.534 UTC failed
```

并且 `migrate status` 显示：

```
The migrations have not yet been applied:
- 20251213000000_add_direction_daily_profit
- 20251213120000_change_category_target_to_percent

The migration from the database are not found locally in prisma/migrations:
- 20251210120000_init
```

## 🎯 问题原因

1. **失败的 migration**: `20251211201412_init` 在数据库中标记为失败状态
2. **不存在的 migration**: 数据库中有一个本地不存在的 migration `20251210120000_init`，可能是之前手动创建的
3. **迁移历史不一致**: 数据库的迁移历史与本地迁移文件不同步

## ✅ 解决方案

### 方法 1: 使用修复脚本（推荐）

```bash
# 1. 给脚本添加执行权限
chmod +x fix-migration.sh

# 2. 运行修复脚本
./fix-migration.sh
```

脚本会引导你完成以下步骤：

1. 检查当前 migration 状态
2. 解决失败的 migration
3. 处理数据库中不存在的 migration
4. 应用剩余的 migrations

### 方法 2: 手动修复

#### 步骤 1: 检查数据库中的 migration 记录

连接到数据库并执行：

```sql
SELECT migration_name, started_at, finished_at, applied_steps_count
FROM _prisma_migrations
ORDER BY started_at DESC;
```

#### 步骤 2: 解决失败的 migration

根据实际情况选择：

**情况 A: 如果表已经存在（通过 `20251210120000_init` 创建）**

```bash
# 标记失败的 migration 为已应用
pnpm prisma migrate resolve --applied 20251211201412_init
```

**情况 B: 如果表不存在**

```bash
# 标记失败的 migration 为已回滚
pnpm prisma migrate resolve --rolled-back 20251211201412_init
```

#### 步骤 3: 处理数据库中不存在的 migration

如果 `20251210120000_init` 创建的表结构与当前 schema 一致，可以删除这个记录：

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '20251210120000_init';
```

**⚠️ 警告**: 只有在确认表结构正确的情况下才执行此操作！

#### 步骤 4: 验证并应用剩余的 migrations

```bash
# 检查状态
pnpm prisma migrate status

# 应用剩余的 migrations
pnpm prisma migrate deploy
```

#### 步骤 5: 完成部署

```bash
# 重新生成 Prisma Client
pnpm prisma generate

# 构建应用
pnpm build

# 重启应用
pm2 restart doumi-financial
```

## 🔍 验证修复

修复后，运行以下命令验证：

```bash
# 应该显示 "Database schema is up to date!"
pnpm prisma migrate status
```

或者查询数据库：

```sql
SELECT migration_name, finished_at
FROM _prisma_migrations
ORDER BY finished_at DESC;
```

应该能看到所有 migrations 都已应用：

- `20251211201412_init` ✅
- `20251213000000_add_direction_daily_profit` ✅
- `20251213120000_change_category_target_to_percent` ✅

## 🚨 常见问题

### Q1: 执行 `migrate resolve` 后仍然失败

**原因**: 可能还有其他问题，如表结构不匹配。

**解决**:

1. 检查表结构是否与 schema 一致
2. 使用 `pnpm prisma db pull` 查看当前数据库结构
3. 手动调整表结构或重新创建 migration

### Q2: 删除 migration 记录后表结构不一致

**原因**: 数据库中的表结构与 schema 不匹配。

**解决**:

1. 备份数据库
2. 使用 `pnpm prisma migrate dev --create-only` 创建新的 migration
3. 手动调整 migration SQL 以匹配当前数据库状态
4. 应用 migration

### Q3: 不确定表是否已存在

**解决**: 连接到数据库并检查：

```sql
-- 检查表是否存在
SHOW TABLES;

-- 检查表结构
DESCRIBE User;
DESCRIBE InvestmentDirection;
DESCRIBE CategoryTarget;
-- ... 其他表
```

## 📝 预防措施

为了避免将来出现类似问题：

1. **统一迁移管理**: 只在开发环境创建 migrations，然后提交到 Git
2. **不要手动修改数据库**: 所有数据库变更都通过 Prisma migrations
3. **定期备份**: 在生产环境执行 migration 前备份数据库
4. **测试迁移**: 在 staging 环境先测试 migrations

## 🔗 相关文档

- [Prisma Migration 文档](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [解决 Migration 问题](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
