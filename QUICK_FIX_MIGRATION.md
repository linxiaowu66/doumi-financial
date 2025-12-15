# 🚀 快速修复 Migration 冲突

## 问题

```
Error: P3009
migrate found failed migrations in the target database
The `20251211201412_init` migration started at 2025-12-11 12:17:42.534 UTC failed
```

## ⚡ 快速修复步骤（5 分钟）

### 1. 检查表是否已存在

连接到数据库执行：

```sql
SHOW TABLES;
```

如果看到 `User`, `InvestmentDirection`, `Fund` 等表，说明表已经存在。

### 2. 标记失败的 migration 为已应用

```bash
pnpm prisma migrate resolve --applied 20251211201412_init
```

### 3. 删除数据库中不存在的 migration 记录

```sql
DELETE FROM _prisma_migrations WHERE migration_name = '20251210120000_init';
```

### 4. 应用剩余的 migrations

```bash
pnpm prisma migrate deploy
```

### 5. 完成部署

```bash
pnpm prisma generate
pnpm build
pm2 restart doumi-financial
```

## ✅ 验证

```bash
pnpm prisma migrate status
```

应该显示：`Database schema is up to date!`

---

**详细说明请查看**: `MIGRATION_FIX.md`
