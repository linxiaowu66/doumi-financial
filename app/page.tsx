import { redirect } from 'next/navigation';

export default function RootPage() {
  // 重定向到受保护的首页，让 (protected)/layout.tsx 处理认证逻辑
  redirect('/dashboard');
}
