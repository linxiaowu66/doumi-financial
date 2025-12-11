# 生产环境部署指南

本文档提供标准的部署流程，包括首次部署和后续代码发布时的数据库更新。

## 📋 前置准备

1. **MySQL 数据库**

   - 已创建数据库（如：`financial`）
   - 已配置数据库用户和密码
   - 数据库可远程访问（如使用云数据库）

2. **环境变量**
   - `DATABASE_URL` - MySQL 连接字符串（格式：`mysql://用户名:密码@主机:端口/数据库名`）
   - `NEXTAUTH_URL` - 生产环境 URL（如：`https://your-domain.com`）**⚠️ 必须设置为公网域名，不能是 localhost**
   - `NEXTAUTH_SECRET` - 随机生成的密钥（可使用 `openssl rand -base64 32` 生成）
   - `AUTH_TRUST_HOST` - 设置为 `true`（可选，代码中已配置 `trustHost: true`）

---

## 🚀 首次部署（新项目）

### 步骤 1: 准备代码

确保迁移文件已提交到 Git：

```bash
# 检查迁移文件是否存在
ls -la prisma/migrations/

# 应该看到类似这样的目录：
# 20251211201412_init/
#   └── migration.sql
```

### 步骤 2: 在生产服务器部署

```bash
# 1. 克隆或拉取代码
git clone <repository-url>
cd doumi-financial
# 或
git pull origin main

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
# 创建 .env 文件或设置环境变量
echo "DATABASE_URL=mysql://user:password@host:3306/database" > .env
echo "NEXTAUTH_URL=https://your-domain.com" >> .env
echo "NEXTAUTH_SECRET=your-secret-key" >> .env

# 4. 生成 Prisma Client
pnpm prisma generate

# 5. 应用数据库迁移（创建所有表）
pnpm prisma migrate deploy

# 6. （可选）运行种子脚本初始化数据
pnpm prisma db seed

# 7. 构建应用
pnpm build

# 8. 启动应用
pnpm start
```

### 验证部署

1. 访问生产环境 URL
2. 注册新用户
3. 创建投资方向
4. 添加基金
5. 创建交易记录

---

## 🔄 后续代码发布（数据库有更新）

当你的代码包含数据库 schema 变更时，需要按以下流程部署：

### 在开发环境创建迁移

1. **修改 `prisma/schema.prisma`**

   例如，添加新字段：

   ```prisma
   model User {
     // ... 现有字段
     phone String?  // 新增字段
   }
   ```

2. **创建迁移文件**

   ```bash
   pnpm prisma migrate dev --name add_user_phone
   ```

   这会：

   - 创建 `prisma/migrations/YYYYMMDDHHMMSS_add_user_phone/` 目录
   - 生成 `migration.sql` 文件
   - 自动应用到开发数据库

3. **测试迁移**

   ```bash
   # 迁移已自动应用到开发数据库
   # 测试应用功能是否正常
   pnpm dev
   ```

4. **提交代码和迁移文件**

   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "Add phone field to User table"
   git push origin main
   ```

### 在生产环境应用更新

```bash
# 1. 拉取最新代码（包含迁移文件）
git pull origin main

# 2. 安装依赖（如果有新的依赖）
pnpm install

# 3. 生成 Prisma Client（如果 schema 有变更）
pnpm prisma generate

# 4. 应用数据库迁移（重要！）
pnpm prisma migrate deploy

# 5. 重新构建应用
pnpm build

# 6. 重启应用
pm2 restart app  # 或使用你的进程管理器
# 或
pnpm start
```

**关键点：**

- ✅ `prisma migrate deploy` 会自动检测并应用所有未应用的迁移
- ✅ 只会应用新的迁移，不会影响已应用的迁移
- ✅ 如果迁移失败，会回滚，数据库保持原状

---

## 🌐 Vercel 部署（推荐）

### 首次部署配置

1. **在 Vercel 导入项目**

   - 连接 GitHub 仓库
   - 选择项目根目录

2. **配置环境变量**

   在 Vercel 项目设置中添加：

   - `DATABASE_URL` - MySQL 连接字符串
   - `NEXTAUTH_URL` - 生产环境 URL（如：`https://your-domain.vercel.app`）
   - `NEXTAUTH_SECRET` - 随机密钥

3. **配置构建命令**

   在 Settings > General > Build Command：

   ```bash
   pnpm prisma generate && pnpm build
   ```

4. **配置部署后命令**

   在 `package.json` 中添加：

   ```json
   {
     "scripts": {
       "postinstall": "prisma generate",
       "vercel-build": "prisma migrate deploy && next build"
     }
   }
   ```

   然后将 Build Command 改为：

   ```bash
   pnpm vercel-build
   ```

5. **部署**

   - 点击 Deploy
   - Vercel 会自动运行构建和迁移

### 后续部署

每次推送代码到 GitHub 时：

1. Vercel 自动检测到代码变更
2. 运行 `pnpm vercel-build`
3. 自动执行 `prisma migrate deploy` 应用新迁移
4. 构建并部署应用

**无需手动操作！** 🎉

---

## 🔍 验证和排查

### 检查迁移状态

```bash
# 查看迁移历史
pnpm prisma migrate status

# 应该显示：
# Database schema is up to date!
```

### 查看已应用的迁移

连接到 MySQL：

```sql
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;
```

### 常见问题

#### 1. 迁移失败

**错误：** `Migration failed`

**解决：**

```bash
# 查看详细错误信息
pnpm prisma migrate deploy --verbose

# 检查数据库连接
pnpm prisma db pull

# 手动修复后重试
pnpm prisma migrate deploy
```

#### 2. 迁移冲突

**错误：** `Migration conflict detected`

**解决：**

- 检查 `_prisma_migrations` 表
- 确保迁移文件顺序正确
- 手动修复数据库后重新运行

#### 3. 数据库连接失败

**检查：**

- `DATABASE_URL` 是否正确
- 数据库是否可访问
- 防火墙规则是否允许连接
- 数据库用户权限是否足够

---

## 📝 迁移文件管理

### 迁移文件结构

```
prisma/
├── migrations/
│   ├── 20251211201412_init/          # 初始迁移
│   │   └── migration.sql
│   ├── 20251215100000_add_user_phone/  # 后续迁移
│   │   └── migration.sql
│   └── migration_lock.toml           # 数据库锁定文件
└── schema.prisma                      # 当前 schema
```

### 迁移文件命名规范

- 格式：`YYYYMMDDHHMMSS_description`
- 示例：`20251215100000_add_user_phone`
- 描述应该清晰说明变更内容

### 不要做的事

- ❌ 不要手动修改已应用的迁移文件
- ❌ 不要删除迁移文件（除非确定不需要）
- ❌ 不要在生产环境使用 `prisma db push`
- ❌ 不要在生产环境使用 `prisma migrate dev`

---

## ✅ 部署检查清单

### 首次部署

- [ ] MySQL 数据库已创建
- [ ] 数据库用户有足够权限（CREATE, ALTER, DROP）
- [ ] 环境变量已配置
- [ ] 迁移文件已提交到 Git
- [ ] 已运行 `prisma generate`
- [ ] 已运行 `prisma migrate deploy`
- [ ] 应用可以正常访问数据库
- [ ] 可以注册/登录用户
- [ ] 功能测试通过

### 后续部署

- [ ] 迁移文件已创建并测试
- [ ] 迁移文件已提交到 Git
- [ ] 已拉取最新代码
- [ ] 已运行 `prisma generate`（如果 schema 有变更）
- [ ] 已运行 `prisma migrate deploy`
- [ ] 应用已重新构建
- [ ] 功能测试通过

---

## 🔧 Nginx 反向代理配置

如果使用 Nginx 作为反向代理，需要正确配置：

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
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
        proxy_pass http://localhost:3001;  # Next.js 应用端口
        proxy_http_version 1.1;

        # 重要：传递原始 Host 头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket 支持（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 关键配置说明

1. **`proxy_set_header Host $host`** - 传递原始 Host 头，NextAuth.js 需要这个来验证主机
2. **`proxy_set_header X-Forwarded-Proto $scheme`** - 传递协议（http/https）
3. **`proxy_set_header X-Forwarded-Host $host`** - 传递原始主机名

### 环境变量配置

在 `.env` 或系统环境变量中设置：

```bash
# ⚠️ 重要：必须设置为公网域名，不能是 localhost
NEXTAUTH_URL=https://your-domain.com

# 其他环境变量
DATABASE_URL=mysql://user:password@host:3306/database
NEXTAUTH_SECRET=your-secret-key

# 可选：明确信任主机（代码中已配置 trustHost: true）
AUTH_TRUST_HOST=true
```

### 验证配置

部署后，检查：

1. **访问应用**

   ```bash
   curl -I https://your-domain.com
   ```

2. **检查 NextAuth 端点**

   ```bash
   curl https://your-domain.com/api/auth/session
   ```

3. **查看日志**

   ```bash
   # Next.js 应用日志
   pm2 logs app

   # Nginx 日志
   tail -f /var/log/nginx/doumi-financial-error.log
   ```

### 常见问题

#### 错误：`UntrustedHost: Host must be trusted`

**原因：**

- `NEXTAUTH_URL` 设置为 `localhost` 或错误的 URL
- Nginx 没有正确传递 Host 头
- `trustHost: true` 未配置

**解决：**

1. 确保 `NEXTAUTH_URL` 设置为公网域名（如：`https://your-domain.com`）
2. 确保 Nginx 配置了 `proxy_set_header Host $host`
3. 确保 `auth.ts` 中配置了 `trustHost: true`（已配置）

#### 错误：`NEXTAUTH_URL` 不匹配

**原因：**

- 环境变量未正确加载
- 多个环境变量文件冲突

**解决：**

```bash
# 检查环境变量
echo $NEXTAUTH_URL

# 在应用启动时打印环境变量（临时调试）
# 在代码中添加：console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
```

---

## 📚 参考命令速查

```bash
# 开发环境
pnpm prisma migrate dev --name migration_name  # 创建并应用迁移
pnpm prisma db push                            # 快速推送（仅开发环境）

# 生产环境
pnpm prisma migrate deploy                     # 应用迁移（生产环境）
pnpm prisma generate                           # 生成 Prisma Client
pnpm prisma migrate status                     # 查看迁移状态

# 通用
pnpm prisma studio                             # 打开数据库可视化工具
pnpm prisma db seed                            # 运行种子脚本
```

---

**祝部署顺利！** 🚀

如有问题，请查看 [Prisma 官方文档](https://www.prisma.io/docs/concepts/components/prisma-migrate)。
