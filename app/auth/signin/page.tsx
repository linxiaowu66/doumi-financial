'use client';

import { useState, Suspense } from 'react';
import { Card, Form, Input, Button, message } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  // 登录
  const handleSignIn = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error('登录失败：邮箱或密码错误');
      } else {
        message.success('登录成功');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>💰 豆米理财</h1>
          <p style={{ color: '#666', margin: 0 }}>个人投资管理系统</p>
        </div>

        <Form onFinish={handleSignIn} size="large">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="邮箱"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
