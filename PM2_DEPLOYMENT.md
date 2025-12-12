# PM2 生产环境部署指南

本文档详细说明如何使用 PM2 在生产环境部署豆米理财投资管理系统。

## 📋 前置准备

1. **服务器环境**

   - Node.js 18+ 已安装
   - pnpm 已安装（`npm install -g pnpm`）
   - MySQL 数据库已配置并可访问
   - Nginx 已安装（用于反向代理）

2. **环境变量**
   - 准备好生产环境的 `.env` 文件

---

## 🚀 部署步骤

### 1. 安装 PM2

```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 --version
```

### 2. 准备项目代码

```bash
# 克隆或拉取代码
git clone <repository-url>
cd doumi-financial

# 或拉取最新代码
git pull origin main

# 安装依赖
pnpm install
```

### 3. 配置环境变量

创建或编辑 `.env` 文件：

```bash
# 数据库连接
DATABASE_URL="mysql://用户名:密码@主机:3306/数据库名"

# NextAuth 配置
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key-here"

# Node 环境
NODE_ENV="production"
```

**⚠️ 重要：**

- `NEXTAUTH_URL` 必须设置为公网域名，不能是 localhost
- `NEXTAUTH_SECRET` 使用强密码（可使用 `openssl rand -base64 32` 生成）

### 4. 初始化数据库

```bash
# 生成 Prisma Client
pnpm prisma generate

# 应用数据库迁移
pnpm prisma migrate deploy
```

### 5. 构建应用

```bash
# 构建生产版本
pnpm build
```

### 6. 创建 PM2 配置文件

在项目根目录创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'doumi-financial',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/path/to/doumi-financial', // 修改为实际项目路径
      instances: 1, // 或 'max' 使用所有 CPU 核心
      exec_mode: 'fork', // 或 'cluster' 用于多实例
      env: {
        NODE_ENV: 'production',
        PORT: 3001, // Next.js 默认端口
      },
      // 环境变量文件（可选，如果不想在 PM2 中配置）
      env_file: '.env',
      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境建议关闭
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      // 其他配置
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
```

### 7. 创建日志目录

```bash
mkdir -p logs
```

### 8. 启动应用

```bash
# 使用配置文件启动
pm2 start ecosystem.config.js

# 或直接启动（不推荐，建议使用配置文件）
pm2 start node_modules/next/dist/bin/next --name doumi-financial -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs doumi-financial

# 查看详细信息
pm2 show doumi-financial
```

### 9. 配置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 按照提示执行生成的命令（通常是 sudo 命令）

# 保存当前 PM2 进程列表
pm2 save
```

---

## 🔧 PM2 常用命令

### 进程管理

```bash
# 启动应用
pm2 start ecosystem.config.js

# 停止应用
pm2 stop doumi-financial

# 重启应用
pm2 restart doumi-financial

# 重载应用（零停机时间）
pm2 reload doumi-financial

# 删除应用
pm2 delete doumi-financial

# 停止所有应用
pm2 stop all

# 删除所有应用
pm2 delete all
```

### 监控和日志

```bash
# 查看所有进程状态
pm2 status

# 查看实时日志
pm2 logs doumi-financial

# 查看最近 100 行日志
pm2 logs doumi-financial --lines 100

# 清空日志
pm2 flush

# 实时监控（CPU、内存）
pm2 monit

# 查看详细信息
pm2 show doumi-financial
```

### 更新和部署

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖（如有新依赖）
pnpm install

# 3. 生成 Prisma Client（如 schema 有变更）
pnpm prisma generate

# 4. 应用数据库迁移（如有新迁移）
pnpm prisma migrate deploy

# 5. 重新构建
pnpm build

# 6. 重载应用（零停机时间）
pm2 reload doumi-financial

# 或重启应用
pm2 restart doumi-financial
```

---

## 📝 推荐的 PM2 配置文件（完整版）

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'doumi-financial',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: process.cwd(),
      instances: 1, // 单实例，如需多实例可改为 'max'
      exec_mode: 'fork',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },

      // 日志配置
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true, // 日志添加时间戳

      // 自动重启配置
      autorestart: true,
      watch: false, // 生产环境关闭文件监听
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      min_uptime: '10s', // 10秒内重启视为异常
      max_restarts: 10, // 最多重启 10 次
      restart_delay: 4000, // 重启延迟 4 秒

      // 其他配置
      kill_timeout: 5000, // 5秒超时
      listen_timeout: 10000, // 10秒监听超时
      shutdown_with_message: true, // 优雅关闭
    },
  ],
};
```

---

## 🔄 部署脚本示例

创建 `deploy.sh` 脚本自动化部署：

```bash
#!/bin/bash

set -e

echo "🚀 开始部署..."

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
pm2 reload doumi-financial

echo "✅ 部署完成！"
echo "📊 查看状态: pm2 status"
echo "📝 查看日志: pm2 logs doumi-financial"
```

使用：

```bash
# 添加执行权限
chmod +x deploy.sh

# 执行部署
./deploy.sh
```

---

## 🌐 Nginx 配置

确保 Nginx 正确配置反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 日志
    access_log /var/log/nginx/doumi-financial-access.log;
    error_log /var/log/nginx/doumi-financial-error.log;

    # 反向代理到 Next.js 应用
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # 重要：传递原始 Host 头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

重启 Nginx：

```bash
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重载配置
```

---

## 📊 监控和维护

### 查看应用状态

```bash
# 实时监控
pm2 monit

# 查看进程信息
pm2 show doumi-financial

# 查看资源使用
pm2 list
```

### 日志管理

```bash
# 查看实时日志
pm2 logs doumi-financial

# 查看错误日志
pm2 logs doumi-financial --err

# 查看输出日志
pm2 logs doumi-financial --out

# 清空日志
pm2 flush

# 日志轮转（需要安装 pm2-logrotate）
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 性能优化

```bash
# 使用集群模式（多实例）
# 修改 ecosystem.config.js:
# instances: 'max',  // 使用所有 CPU 核心
# exec_mode: 'cluster',  // 集群模式

# 然后重启
pm2 restart doumi-financial
```

---

## 🔍 故障排查

### 应用无法启动

```bash
# 1. 查看错误日志
pm2 logs doumi-financial --err

# 2. 检查环境变量
pm2 show doumi-financial

# 3. 检查端口是否被占用
lsof -i :3001

# 4. 检查数据库连接
# 在 .env 中确认 DATABASE_URL 正确

# 5. 手动测试启动
cd /path/to/doumi-financial
pnpm start
```

### 应用频繁重启

```bash
# 1. 查看重启原因
pm2 logs doumi-financial --lines 100

# 2. 检查内存使用
pm2 monit

# 3. 检查系统资源
free -h
df -h

# 4. 调整内存限制
# 修改 ecosystem.config.js 中的 max_memory_restart
```

### 数据库连接问题

```bash
# 1. 测试数据库连接
mysql -h 主机 -u 用户名 -p 数据库名

# 2. 检查环境变量
cat .env | grep DATABASE_URL

# 3. 检查 Prisma 连接
pnpm prisma db pull
```

---

## ✅ 部署检查清单

部署前确认：

- [ ] Node.js 18+ 已安装
- [ ] pnpm 已安装
- [ ] PM2 已安装
- [ ] MySQL 数据库已创建并可访问
- [ ] 环境变量已配置（`.env` 文件）
- [ ] `NEXTAUTH_URL` 设置为公网域名
- [ ] `NEXTAUTH_SECRET` 已设置（强密码）
- [ ] 已运行 `pnpm prisma generate`
- [ ] 已运行 `pnpm prisma migrate deploy`
- [ ] 已运行 `pnpm build`
- [ ] PM2 配置文件已创建
- [ ] 日志目录已创建
- [ ] Nginx 已配置反向代理
- [ ] PM2 已配置开机自启
- [ ] 应用可以正常访问
- [ ] 可以注册/登录用户
- [ ] 功能测试通过

---

## 📚 参考资源

- [PM2 官方文档](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Next.js 部署文档](https://nextjs.org/docs/deployment)
- [Prisma 部署指南](https://www.prisma.io/docs/guides/deployment)

---

**祝部署顺利！** 🚀
