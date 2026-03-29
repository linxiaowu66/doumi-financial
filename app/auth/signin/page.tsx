"use client";

import { useState, Suspense, useEffect } from "react";
import { Card, Form, Input, Button, message, Tabs } from "antd";
import { LockOutlined, MailOutlined, UserOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [allowRegister, setAllowRegister] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  // 检查是否允许注册（只在非生产环境）
  useEffect(() => {
    const checkRegisterEnabled = async () => {
      try {
        const response = await fetch("/api/auth/register/check");
        const data = await response.json();
        setAllowRegister(data.enabled || false);
      } catch {
        // 如果出错，默认不允许注册
        setAllowRegister(false);
      }
    };
    checkRegisterEnabled();
  }, []);

  // 登录
  const handleSignIn = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        message.error("登录失败：邮箱或密码错误");
      } else {
        message.success("登录成功");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error("登录失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (values: {
    email: string;
    password: string;
    name?: string;
  }) => {
    setRegisterLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("注册成功，请登录");
        setActiveTab("login");
      } else {
        message.error(data.error || "注册失败，请重试");
      }
    } catch {
      message.error("注册失败，请重试");
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "16px 8px",
      }}
    >
      <Card className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1>💰 豆米理财</h1>
          <p>个人投资管理系统</p>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "login",
              label: "登录",
              children: (
                <Form onFinish={handleSignIn} size="large">
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: "请输入邮箱" },
                      { type: "email", message: "请输入有效的邮箱地址" },
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
                    rules={[{ required: true, message: "请输入密码" }]}
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
              ),
            },
            // 只在非生产环境显示注册标签
            ...(allowRegister
              ? [
                  {
                    key: "register",
                    label: "注册",
                    children: (
                      <Form onFinish={handleRegister} size="large">
                        <Form.Item
                          name="email"
                          rules={[
                            { required: true, message: "请输入邮箱" },
                            { type: "email", message: "请输入有效的邮箱地址" },
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
                          rules={[
                            { required: true, message: "请输入密码" },
                            { min: 6, message: "密码长度至少为6位" },
                          ]}
                        >
                          <Input.Password
                            prefix={<LockOutlined />}
                            placeholder="密码（至少6位）"
                            autoComplete="new-password"
                          />
                        </Form.Item>

                        <Form.Item name="name">
                          <Input
                            prefix={<UserOutlined />}
                            placeholder="姓名（可选）"
                            autoComplete="name"
                          />
                        </Form.Item>

                        <Form.Item>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={registerLoading}
                            block
                          >
                            注册
                          </Button>
                        </Form.Item>
                      </Form>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: 40 }}>加载中...</div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
