export default async function UsersPage() {
  // 注意：这里需要配置 MySQL 数据库后才能正常工作
  // 请在 .env 文件中配置 DATABASE_URL

  let users = [];
  let error = null;

  try {
    // 尝试导入 Prisma Client
    const prisma = (await import('@/lib/prisma')).default;
    // 尝试连接数据库
    users = await prisma.user.findMany({
      take: 10,
    });
  } catch (e: unknown) {
    const err = e as Error;
    error = err.message;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6">用户列表</h1>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Prisma 配置状态</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="mb-2">
                <strong>✅ Prisma Client:</strong> 已生成（6.19.0）
              </p>
              <p className="mb-2">
                <strong>✅ Schema:</strong> 已配置（User 和 Post 模型）
              </p>
              <p>
                <strong>📁 输出位置:</strong> app/generated/prisma
              </p>
            </div>
          </div>

          {error ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                ⚠️ 数据库连接提示
              </h3>
              <p className="text-yellow-700 mb-4">
                请先配置 MySQL 数据库连接才能查看用户数据。
              </p>
              <div className="bg-white rounded p-4 text-sm">
                <p className="font-semibold mb-2">配置步骤：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>在 .env 文件中设置 DATABASE_URL</li>
                  <li>
                    运行：
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      pnpm prisma migrate dev --name init
                    </code>
                  </li>
                  <li>
                    运行：
                    <code className="bg-gray-100 px-2 py-1 rounded">
                      pnpm prisma db seed
                    </code>
                  </li>
                  <li>刷新此页面</li>
                </ol>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600">
                  查看错误详情
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                  {error}
                </pre>
              </details>
            </div>
          ) : users.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                找到 {users.length} 个用户
              </h3>
              <div className="space-y-4">
                {users.map(
                  (user: {
                    id: number;
                    name: string | null;
                    email: string;
                  }) => (
                    <div
                      key={user.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-semibold text-lg">
                        {user.name || '未命名'}
                      </h4>
                      <p className="text-gray-600">{user.email}</p>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-600">
                数据库已连接，但没有找到用户数据。请运行种子脚本：
              </p>
              <code className="block mt-2 bg-gray-100 px-4 py-2 rounded">
                pnpm prisma db seed
              </code>
            </div>
          )}

          <div className="mt-8">
            <a
              href="/"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← 返回首页
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
