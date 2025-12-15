#!/bin/bash

set -e

echo "🔧 Prisma Migration 修复脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}⚠️  警告：此脚本将修改数据库的 migration 状态${NC}"
echo -e "${YELLOW}请确保你已经备份了数据库！${NC}"
echo ""
read -p "是否继续？(y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "已取消"
    exit 1
fi

echo ""
echo "📊 步骤 1: 检查当前 migration 状态..."
pnpm prisma migrate status

echo ""
echo "📋 步骤 2: 查看数据库中的 migration 记录..."
echo "请手动执行以下 SQL 查询来查看数据库中的 migration 记录："
echo ""
echo "SELECT migration_name, started_at, finished_at, applied_steps_count"
echo "FROM _prisma_migrations"
echo "ORDER BY started_at DESC;"
echo ""
read -p "按 Enter 继续..."

echo ""
echo -e "${YELLOW}步骤 3: 解决失败的 migration${NC}"
echo ""
echo "数据库中的 migration '20251211201412_init' 标记为失败。"
echo "请选择处理方式："
echo "1) 如果表已经存在（通过 20251210120000_init 创建），标记为已应用"
echo "2) 如果表不存在，标记为已回滚"
echo ""
read -p "请选择 (1/2): " choice

case $choice in
    1)
        echo ""
        echo "标记 migration 为已应用..."
        pnpm prisma migrate resolve --applied 20251211201412_init
        echo -e "${GREEN}✅ Migration 已标记为已应用${NC}"
        ;;
    2)
        echo ""
        echo "标记 migration 为已回滚..."
        pnpm prisma migrate resolve --rolled-back 20251211201412_init
        echo -e "${GREEN}✅ Migration 已标记为已回滚${NC}"
        ;;
    *)
        echo -e "${RED}无效选择，退出${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${YELLOW}步骤 4: 处理数据库中不存在的 migration${NC}"
echo ""
echo "数据库中有一个本地不存在的 migration: 20251210120000_init"
echo "这个 migration 可能是之前手动创建的。"
echo ""
echo "选项："
echo "1) 如果这个 migration 创建的表结构与当前 schema 一致，手动删除这个记录"
echo "2) 如果表结构不一致，需要手动调整"
echo ""
echo "如果选择选项 1，请执行以下 SQL："
echo ""
echo "DELETE FROM _prisma_migrations WHERE migration_name = '20251210120000_init';"
echo ""
read -p "是否已处理？(y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}请手动处理后再运行此脚本${NC}"
    exit 1
fi

echo ""
echo "📊 步骤 5: 再次检查 migration 状态..."
pnpm prisma migrate status

echo ""
echo "🚀 步骤 6: 应用剩余的 migrations..."
pnpm prisma migrate deploy

echo ""
echo -e "${GREEN}✅ Migration 修复完成！${NC}"
echo ""
echo "下一步："
echo "1. 运行 pnpm prisma generate"
echo "2. 运行 pnpm build"
echo "3. 重启应用"

