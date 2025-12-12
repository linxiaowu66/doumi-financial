# 豆米理财 - 个人投资管理系统

基于 Next.js 16 + Prisma 6 + Ant Design 6 + MySQL 构建的现代化个人投资管理系统，支持基金投资管理、交易记录、收益统计等功能。

## ✨ 功能特性

- 📊 **投资方向管理** - 管理多个投资账户（如海外长钱、稳钱账户等）
- 💰 **基金管理** - 添加、编辑、删除基金，支持分类管理
- 📈 **交易记录** - 记录买入、卖出、分红（现金/再投资）交易
- 📅 **计划买入** - 设置计划买入金额，待时机合适时执行
- 🎯 **分类目标** - 为每个基金分类设置投入上限
- 📊 **收益统计** - 实时计算持仓成本、持仓收益、累计收益等
- 💹 **净值更新** - 自动获取基金最新净值（天天基金 API）
- 🔄 **批量更新** - 一键更新所有基金净值，防止 API 限流
- 👤 **用户认证** - 基于 NextAuth.js 的用户登录和注册
- 📱 **响应式设计** - 完美支持桌面端和移动端访问

## 🚀 技术栈

- **Next.js** 16.0.8 - React 全栈框架（App Router）
- **React** 19.2.1 - UI 库
- **Prisma** 6.19.0 - 下一代 ORM
- **Ant Design** 6.1.0 - 企业级 UI 组件库
- **NextAuth.js** 5.0.0-beta.30 - 身份认证
- **TypeScript** 5.x - 类型安全
- **ESLint** 9.x - 代码质量
- **Tailwind CSS** 4.x - 实用优先的 CSS 框架
- **MySQL** - 关系型数据库（使用 mysql2 驱动）
- **dayjs** - 日期处理库
- **bcryptjs** - 密码加密

## 📦 项目结构

```
doumi-financial/
├── app/
│   ├── (protected)/              # 受保护的路由组
│   │   ├── dashboard/           # 首页/仪表盘
│   │   ├── investment-directions/  # 投资方向管理
│   │   │   ├── [id]/           # 投资方向详情页
│   │   │   └── page.tsx        # 投资方向列表页
│   │   ├── funds/               # 基金管理
│   │   │   └── [id]/           # 基金详情页
│   │   └── layout.tsx          # 受保护路由布局（认证检查）
│   ├── api/                     # API 路由
│   │   ├── auth/               # 认证相关
│   │   │   ├── [...nextauth]/  # NextAuth 处理
│   │   │   └── register/       # 用户注册
│   │   ├── funds/              # 基金相关 API
│   │   │   ├── batch-update-networth/  # 批量更新净值
│   │   │   └── [id]/
│   │   │       ├── stats/      # 基金统计
│   │   │       └── net-worth/  # 净值更新
│   │   ├── investment-directions/  # 投资方向 API
│   │   │   └── [id]/
│   │   │       └── summary/    # 收益汇总
│   │   ├── transactions/       # 交易记录 API
│   │   ├── planned-purchases/  # 计划买入 API
│   │   ├── category-targets/  # 分类目标 API
│   │   └── fund-price/         # 基金价格查询（天天基金）
│   ├── auth/                   # 认证页面
│   │   └── signin/             # 登录/注册页
│   ├── layout.tsx              # 根布局
│   ├── page.tsx                # 根页面（重定向到登录）
│   └── providers.tsx           # Ant Design + Session Provider
├── components/
│   └── AdminLayout.tsx         # 后台管理布局（侧边栏+头部）
├── lib/
│   └── prisma.ts               # Prisma Client 实例
├── prisma/
│   ├── schema.prisma           # 数据库模型
│   └── seed.ts                 # 种子数据（可选）
├── auth.ts                     # NextAuth 配置
├── .env                        # 环境变量
└── package.json                # 依赖配置
```

## 🛠️ 安装和运行

### 1. 克隆项目

```bash
git clone <repository-url>
cd doumi-financial
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

创建 `.env` 文件并配置以下变量：

```env
# 数据库连接
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

示例：

```env
DATABASE_URL="mysql://root@localhost:3306/financial"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

### 4. 初始化数据库

```bash
# 推送 schema 到数据库（创建表结构）
pnpm prisma db push

# 生成 Prisma Client
pnpm prisma generate
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)，会自动重定向到登录页。

### 6. 创建账户

首次使用需要注册账户：

- 访问 `/auth/signin`
- 切换到"注册"标签
- 填写邮箱、密码、姓名（可选）
- 注册成功后自动跳转到登录页

## 📝 数据模型

### User（用户）

- `id` - 用户 ID
- `email` - 邮箱（唯一）
- `name` - 姓名（可选）
- `password` - 加密后的密码
- `investmentDirections` - 用户的投资方向列表

### InvestmentDirection（投资方向）

- `id` - 投资方向 ID
- `userId` - 所属用户 ID
- `name` - 投资方向名称（如：海外长钱、稳钱账户）
- `expectedAmount` - 预期投入金额
- `actualAmount` - 实际投入金额
- `funds` - 该方向下的基金列表
- `categoryTargets` - 分类目标列表

### Fund（基金）

- `id` - 基金 ID
- `directionId` - 所属投资方向 ID
- `code` - 基金代码
- `name` - 基金名称
- `category` - 分类标识（如：标普、纳指）
- `remark` - 备注
- `latestNetWorth` - 最新净值
- `netWorthDate` - 净值日期
- `netWorthUpdateAt` - 净值更新时间
- `transactions` - 交易记录列表
- `plannedPurchases` - 计划买入列表

### Transaction（交易记录）

- `id` - 交易 ID
- `fundId` - 所属基金 ID
- `type` - 交易类型：BUY（买入）、SELL（卖出）、DIVIDEND（分红）
- `amount` - 交易金额
- `shares` - 份额
- `price` - 单价/净值
- `fee` - 手续费
- `date` - 交易日期
- `dividendReinvest` - 分红是否再投资（仅分红时有效）
- `remark` - 备注

### PlannedPurchase（计划买入）

- `id` - 计划 ID
- `fundId` - 所属基金 ID
- `plannedAmount` - 计划买入金额
- `status` - 状态：PENDING（待买入）、COMPLETED（已完成）
- `createdAt` - 创建时间
- `purchasedAt` - 实际买入时间

### CategoryTarget（分类目标）

- `id` - 目标 ID
- `directionId` - 所属投资方向 ID
- `categoryName` - 分类名称（如：标普、纳指）
- `targetAmount` - 目标投入金额

## 🎯 核心功能

### 1. 投资方向管理

- 创建、编辑、删除投资方向
- 设置预期投入金额
- 查看实际投入金额和投入进度
- 查看该方向下的所有基金

**路由：** `/investment-directions`

### 2. 基金管理

- 在投资方向下添加基金
- 设置基金代码、名称、分类
- 编辑基金信息
- 删除基金（会级联删除所有交易记录）

**路由：** `/investment-directions/[id]`

### 3. 交易记录

#### 买入

- 输入买入金额、手续费、净值
- 自动计算份额：`(买入金额 - 手续费) / 净值`
- 更新持仓成本、持仓份额

#### 卖出

- 输入卖出份额、手续费、净值
- 自动计算卖出金额
- 计算卖出收益
- 更新持仓份额

#### 分红

- **现金分红**：直接记录分红金额，不更新份额
- **分红再投资**：输入分红金额和净值，自动计算再投资份额

**路由：** `/funds/[id]`

### 4. 计划买入

- 设置计划买入金额
- 状态：待买入、已完成
- 执行计划：将计划转换为买入交易记录

**路由：** `/funds/[id]`（在基金详情页）

### 5. 收益统计

#### 基金级别统计

- 持仓份额、持仓成本价、持仓成本
- 持仓市值、持仓收益、持仓收益率
- 累计收益、累计收益率
- 卖出收益、现金分红、再投资分红

#### 投资方向级别统计

- 总投入金额、总持仓市值
- 持仓收益、累计收益、累计收益率
- 卖出收益、现金分红、再投资分红
- 基金数量

**路由：**

- 基金统计：`/funds/[id]`
- 方向统计：`/investment-directions/[id]`

### 6. 净值更新

- **自动更新**：进入基金详情页时，如果今天未更新过，自动获取最新净值
- **手动更新**：点击"获取最新"按钮手动更新
- **批量更新**：在首页点击"更新所有净值"按钮，批量更新所有基金净值
- **防限流**：批量更新时，每个基金请求间隔 500ms

**数据源：** 天天基金网 API (`fundgz.1234567.com.cn`)

### 7. 分类目标

- 为每个基金分类设置投入上限
- 显示当前仓位和目标仓位
- 显示投入进度百分比
- 防止超限投入

**路由：** `/investment-directions/[id]`

## 📱 响应式设计

系统完美支持移动端访问：

- **断点：** 768px
- **移动端特性：**

  - 抽屉式导航（侧边栏）
  - 卡片式列表（替代表格）
  - 全宽按钮
  - 紧凑间距
  - 优化的字体大小

- **桌面端特性：**
  - 固定侧边栏
  - 表格视图
  - 多列布局
  - 完整功能

## 🔧 常用命令

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# Prisma 相关
pnpm prisma studio          # 打开 Prisma Studio（数据库可视化工具）
pnpm prisma migrate dev     # 创建并应用迁移
pnpm prisma generate        # 生成 Prisma Client
pnpm prisma db seed         # 运行种子脚本
pnpm prisma db push         # 推送 schema 到数据库（不创建迁移）
```

## 📄 页面路由

### 公开页面

- `/` - 根页面（重定向到 `/auth/signin`）
- `/auth/signin` - 登录/注册页

### 受保护页面（需要登录）

- `/dashboard` - 首页/仪表盘
  - 显示投资概览统计
  - 投资方向列表
  - 批量更新净值按钮
- `/investment-directions` - 投资方向列表
- `/investment-directions/[id]` - 投资方向详情
  - 基金列表（按分类分组）
  - 收益汇总
  - 分类目标管理
- `/funds/[id]` - 基金详情
  - 持仓统计
  - 交易记录
  - 计划买入列表

## 🔐 认证和授权

- **认证方式：** NextAuth.js Credentials Provider
- **密码加密：** bcryptjs
- **Session 策略：** JWT
- **路由保护：** 使用 Route Groups `(protected)` 自动保护

### 注册流程

1. 访问 `/auth/signin`
2. 切换到"注册"标签
3. 填写邮箱、密码、姓名（可选）
4. 系统自动加密密码并创建用户

### 登录流程

1. 访问 `/auth/signin`
2. 输入邮箱和密码
3. 系统验证后创建 JWT Session
4. 重定向到 `/dashboard`

## 🌐 API 路由

### 认证相关

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/[...nextauth]` - NextAuth 处理

### 投资方向

- `GET /api/investment-directions` - 获取投资方向列表
- `POST /api/investment-directions` - 创建投资方向
- `GET /api/investment-directions/[id]` - 获取投资方向详情
- `PUT /api/investment-directions/[id]` - 更新投资方向
- `DELETE /api/investment-directions/[id]` - 删除投资方向
- `GET /api/investment-directions/[id]/summary` - 获取收益汇总

### 基金

- `GET /api/funds` - 获取基金列表（支持 `directionId` 查询参数）
- `POST /api/funds` - 创建基金
- `GET /api/funds/[id]` - 获取基金详情
- `PUT /api/funds/[id]` - 更新基金
- `DELETE /api/funds/[id]` - 删除基金
- `GET /api/funds/[id]/stats` - 获取基金统计（支持 `currentPrice` 查询参数）
- `PUT /api/funds/[id]/net-worth` - 更新基金净值
- `POST /api/funds/batch-update-networth` - 批量更新净值

### 交易记录

- `GET /api/transactions` - 获取交易记录（支持 `fundId` 查询参数）
- `POST /api/transactions` - 创建交易记录
- `PUT /api/transactions/[id]` - 更新交易记录
- `DELETE /api/transactions/[id]` - 删除交易记录

### 计划买入

- `GET /api/planned-purchases` - 获取计划买入（支持 `fundId` 和 `status` 查询参数）
- `POST /api/planned-purchases` - 创建计划买入
- `PUT /api/planned-purchases/[id]` - 更新计划状态
- `POST /api/planned-purchases/[id]/execute` - 执行计划买入
- `DELETE /api/planned-purchases/[id]` - 删除计划

### 分类目标

- `GET /api/category-targets` - 获取分类目标（支持 `directionId` 查询参数）
- `POST /api/category-targets` - 创建/更新分类目标

### 基金价格

- `GET /api/fund-price?code=基金代码` - 获取基金最新净值（天天基金 API）

## 📚 文档

- [净值更新功能说明](./NET_WORTH_FEATURE.md) - 净值更新功能的详细说明
- [快速开始指南](./QUICKSTART.md) - 快速上手指南

## 🌐 部署

### 快速开始

**首次部署：**

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量（.env 文件）
DATABASE_URL="mysql://user:password@host:3306/database"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# 3. 生成 Prisma Client
pnpm prisma generate

# 4. 应用数据库迁移（创建所有表）
pnpm prisma migrate deploy

# 5. 构建并启动
pnpm build
pnpm start
```

**后续代码发布（数据库有更新）：**

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖（如有新依赖）
pnpm install

# 3. 生成 Prisma Client（如 schema 有变更）
pnpm prisma generate

# 4. 应用数据库迁移（自动检测并应用新迁移）
pnpm prisma migrate deploy

# 5. 重新构建并启动
pnpm build
pnpm start
```

**⚠️ 重要：生产环境使用 `prisma migrate deploy`，不要使用 `prisma db push`！**

### Nginx 反向代理配置

如果使用 Nginx 作为反向代理，需要：

1. **配置 `auth.ts`** - 已添加 `trustHost: true`（✅ 已完成）

2. **设置环境变量** - `NEXTAUTH_URL` 必须设置为公网域名：

   ```bash
   NEXTAUTH_URL=https://your-domain.com  # ⚠️ 不能是 localhost
   ```

3. **配置 Nginx** - 确保传递正确的 Host 头：
   ```nginx
   proxy_set_header Host $host;
   proxy_set_header X-Forwarded-Proto $scheme;
   proxy_set_header X-Forwarded-Host $host;
   ```

详细部署指南和 Nginx 配置示例请查看 [DEPLOYMENT.md](./DEPLOYMENT.md)

### PM2 部署（推荐用于服务器）

使用 PM2 管理 Node.js 进程：

```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 配置环境变量（.env 文件）
DATABASE_URL="mysql://user:password@host:3306/database"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# 3. 初始化数据库
pnpm prisma generate
pnpm prisma migrate deploy

# 4. 构建应用
pnpm build

# 5. 启动应用（使用配置文件）
pm2 start ecosystem.config.js

# 6. 配置开机自启
pm2 startup
pm2 save
```

**后续更新：**

```bash
# 使用自动化部署脚本
./deploy.sh

# 或手动更新
git pull origin main
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy
pnpm build
pm2 reload doumi-financial
```

详细 PM2 部署指南请查看 [PM2_DEPLOYMENT.md](./PM2_DEPLOYMENT.md)

### Vercel 部署 (推荐)

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量：
   - `DATABASE_URL` - MySQL 数据库连接字符串
   - `NEXTAUTH_URL` - 生产环境 URL（如：`https://your-domain.com`）
   - `NEXTAUTH_SECRET` - 随机生成的密钥（用于加密 session）
4. 配置构建命令：
   ```bash
   pnpm prisma generate && pnpm build
   ```
5. 配置部署后命令（在 Vercel 的 Settings > Git > Deploy Hooks）：
   ```bash
   pnpm prisma migrate deploy
   ```
   或者在 Vercel 的 Environment Variables 中添加 `POSTINSTALL_COMMAND`：
   ```
   POSTINSTALL_COMMAND=prisma migrate deploy
   ```

### 其他平台部署

确保：

- 配置所有必需的环境变量
- 运行 `pnpm prisma generate` 在构建时生成 Prisma Client
- 运行 `pnpm prisma migrate deploy` 在生产环境应用数据库迁移
- MySQL 数据库可访问
- 生产环境使用强密码和安全的 `NEXTAUTH_SECRET`

## ⚠️ 注意事项

1. **Prisma Client 生成位置**：配置为 `app/generated/prisma`，确保与导入路径一致
2. **MySQL 版本**：建议使用 MySQL 5.7+ 或 8.0+
3. **环境变量**：`.env` 文件不要提交到版本控制系统
4. **生产环境**：
   - 使用强密码和安全的 `NEXTAUTH_SECRET`
   - 配置连接池和适当的数据库配置
   - 使用 HTTPS
5. **API 限流**：批量更新净值时，每个基金请求间隔 500ms，避免触发限流
6. **净值数据**：净值数据来自天天基金网，可能存在 T-1 延迟（如美股）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
