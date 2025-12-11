# 豆米财经

基于 Next.js 16 + Prisma 6 + Ant Design 6 + MySQL 构建的现代化 Web 应用。

## 🚀 技术栈

- **Next.js** 16.0.8 - React 全栈框架
- **React** 19.2.1 - UI 库
- **Prisma** 6.19.0 - 下一代 ORM
- **Ant Design** 6.1.0 - 企业级 UI 组件库
- **TypeScript** 5.x - 类型安全
- **ESLint** 9.x - 代码质量
- **Tailwind CSS** 4.x - 实用优先的 CSS 框架
- **MySQL** - 关系型数据库（使用 mysql2 驱动）

## 📦 项目结构

```
doumi-financial/
├── app/                    # Next.js App Router
│   ├── generated/         # Prisma Client 生成文件
│   ├── users/            # 用户列表页面（Prisma 示例）
│   ├── with-antd/        # Ant Design 示例页面
│   ├── layout.tsx        # 根布局
│   ├── page.tsx          # 首页
│   └── providers.tsx     # Ant Design Provider
├── lib/                   # 工具库
│   └── prisma.ts         # Prisma Client 实例
├── prisma/               # Prisma 配置
│   ├── schema.prisma     # 数据库模型
│   └── seed.ts           # 种子数据
├── .env                  # 环境变量
└── package.json          # 依赖配置
```

## 🛠️ 安装和运行

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置数据库

在 `.env` 文件中配置 MySQL 数据库连接：

```env
DATABASE_URL="mysql://用户名:密码@localhost:3306/数据库名"
```

例如：

```env
DATABASE_URL="mysql://root:password@localhost:3306/doumi_financial"
```

### 3. 运行数据库迁移

```bash
# 创建数据库表
pnpm prisma migrate dev --name init

# 生成 Prisma Client
pnpm prisma generate
```

### 4. （可选）填充种子数据

```bash
pnpm prisma db seed
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📝 Prisma 数据模型

项目包含两个示例模型：

```prisma
model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
  posts Post[]
}

model Post {
  id        Int     @id @default(autoincrement())
  title     String
  content   String? @db.Text
  published Boolean @default(false)
  authorId  Int
  author    User    @relation(fields: [authorId], references: [id])
}
```

## 🎨 Ant Design 配置

Ant Design 已通过 `AntdProvider` 在 `app/layout.tsx` 中全局配置，支持：

- 中文语言包
- 自定义主题色
- 所有 Ant Design 组件

## 📄 可用页面

- **`/`** - 首页，展示技术栈信息
- **`/with-antd`** - Ant Design 组件示例
- **`/users`** - 用户列表（Prisma 数据库集成示例）

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

## 📚 数据库操作示例

### 查询用户

```typescript
import prisma from '@/lib/prisma'

const users = await prisma.user.findMany({
  include: {
    posts: true
  }
})
```

### 创建用户

```typescript
const user = await prisma.user.create({
  data: {
    name: 'Alice',
    email: 'alice@example.com',
    posts: {
      create: [
        { title: 'My first post', content: 'Hello World!' }
      ]
    }
  }
})
```

## 🌐 部署

### Vercel (推荐)

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `DATABASE_URL`
4. 部署

### 其他平台

确保：

- 配置 `DATABASE_URL` 环境变量
- 运行 `pnpm prisma generate` 在构建时生成 Prisma Client
- MySQL 数据库可访问

## 📖 文档链接

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Ant Design 文档](https://ant.design/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## ⚠️ 注意事项

1. **Prisma Client 生成位置**：配置为 `app/generated/prisma`，确保与导入路径一致
2. **MySQL 版本**：建议使用 MySQL 5.7+ 或 8.0+
3. **环境变量**：`.env` 文件不要提交到版本控制系统
4. **生产环境**：使用连接池和适当的数据库配置

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT
