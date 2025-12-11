# 快速启动指南

## 🚀 5 分钟快速上手

### 前提条件

- ✅ Node.js 20+ 已安装
- ✅ pnpm 已安装
- ⚠️ MySQL 服务器（可选，用于数据库功能）

### 步骤 1: 项目已就绪 ✅

项目已经初始化完成，所有依赖已安装。当前开发服务器正在运行：

```
http://localhost:3000
```

### 步骤 2: 查看示例页面 🎨

打开浏览器访问以下页面：

1. **首页** - http://localhost:3000

   - 查看技术栈概览

2. **Ant Design 示例** - http://localhost:3000/with-antd

   - 查看 Ant Design 6 组件

3. **用户列表** - http://localhost:3000/users
   - 查看 Prisma 集成（需要配置数据库）

### 步骤 3: 配置数据库（可选）📦

如果需要使用 Prisma 数据库功能：

#### 3.1 启动 MySQL（选择一种方式）

**方式 A: 使用 Docker（推荐）**

```bash
docker run -d \
  --name mysql-doumi \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=doumi_financial \
  -p 3306:3306 \
  mysql:8.0
```

**方式 B: 本地安装**

```bash
# macOS
brew install mysql
brew services start mysql

# 创建数据库
mysql -u root -p
CREATE DATABASE doumi_financial;
EXIT;
```

#### 3.2 配置环境变量

编辑 `.env` 文件：

```env
DATABASE_URL="mysql://root:password@localhost:3306/doumi_financial"
```

#### 3.3 运行数据库迁移

```bash
# 创建数据库表
pnpm prisma migrate dev --name init

# 填充示例数据
pnpm prisma db seed

# 查看数据（可选）
pnpm prisma studio
```

#### 3.4 刷新用户列表页面

现在访问 http://localhost:3000/users 就能看到数据了！

## 📝 常用命令

```bash
# 开发
pnpm dev          # 启动开发服务器（已运行）

# 构建
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器

# 代码质量
pnpm lint         # 运行 ESLint

# 数据库
pnpm prisma studio              # 打开数据库管理界面
pnpm prisma migrate dev         # 创建新的数据库迁移
pnpm prisma db seed             # 运行种子脚本
pnpm prisma generate            # 重新生成 Prisma Client
```

## 🎯 下一步做什么？

### 1. 熟悉项目结构

```
app/
├── page.tsx              # 修改首页
├── with-antd/page.tsx    # Ant Design 示例
├── users/page.tsx        # Prisma 数据库示例
└── providers.tsx         # Ant Design 全局配置

lib/
└── prisma.ts             # Prisma Client 实例

prisma/
├── schema.prisma         # 数据库模型
└── seed.ts               # 种子数据
```

### 2. 创建新页面

在 `app/` 目录下创建新文件夹和 `page.tsx`：

```typescript
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">关于我们</h1>
      <p>这是关于页面</p>
    </div>
  )
}
```

访问 http://localhost:3000/about

### 3. 使用 Ant Design 组件

```typescript
'use client'

import { Button, Card } from 'antd'

export default function MyPage() {
  return (
    <Card title="我的卡片">
      <Button type="primary">点击我</Button>
    </Card>
  )
}
```

### 4. 查询数据库

```typescript
import prisma from '@/lib/prisma'

export default async function MyPage() {
  const users = await prisma.user.findMany()

  return (
    <div>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  )
}
```

## 🔧 故障排除

### 问题 1: 端口 3000 已被占用

```bash
# 停止当前服务器
pkill -f "next dev"

# 或使用其他端口
pnpm dev -- -p 3001
```

### 问题 2: Prisma Client 未生成

```bash
pnpm prisma generate
```

### 问题 3: 数据库连接失败

- 检查 MySQL 是否运行：`mysql --version`
- 验证 `.env` 中的 `DATABASE_URL`
- 确保数据库已创建

### 问题 4: 编译错误

```bash
# 清除缓存
rm -rf .next
rm -rf node_modules
pnpm install
```

## 📚 学习资源

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Ant Design 文档](https://ant.design/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)

## 🎉 开始开发！

现在你可以：

✅ 打开 VS Code / Cursor 开始编码  
✅ 修改文件，查看热重载效果  
✅ 添加新功能和页面  
✅ 使用 Ant Design 组件构建 UI  
✅ 用 Prisma 操作数据库

**祝开发愉快！** 🚀
