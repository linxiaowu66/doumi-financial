#!/bin/bash

set -e

echo "🚀 开始部署豆米理财..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装依赖
echo "📦 安装依赖..."
pnpm install

# 3. 生成 Prisma Client
echo "🔧 生成 Prisma Client..."
pnpm prisma generate

# 4. 应用数据库迁移
echo "🗄️  应用数据库迁移..."
pnpm prisma migrate deploy

# 5. 构建应用
echo "🏗️  构建应用..."
pnpm build

# 6. 重载 PM2 应用
echo "🔄 重载应用..."
pm2 reload doumi-financial || pm2 start ecosystem.config.js

echo "✅ 部署完成！"
echo ""
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs doumi-financial"
echo "🔍 实时监控: pm2 monit"
