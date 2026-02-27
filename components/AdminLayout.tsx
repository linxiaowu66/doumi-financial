"use client";

import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  theme,
  Dropdown,
  Avatar,
  Space,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  FundOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const { Header, Sider, Content } = Layout;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 用户菜单
  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontWeight: "bold" }}>
            {session?.user?.name || session?.user?.email}
          </div>
          <div style={{ fontSize: 12, color: "#999" }}>
            {session?.user?.email}
          </div>
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: () => signOut({ callbackUrl: "/" }),
    },
  ];

  // 菜单项配置
  const menuItems: MenuProps["items"] = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: <Link href="/dashboard">首页</Link>,
      onClick: () => {
        if (isMobile) setDrawerVisible(false);
      },
    },
    {
      key: "/investment-directions",
      icon: <FundOutlined />,
      label: <Link href="/investment-directions">投资方向</Link>,
      onClick: () => {
        if (isMobile) setDrawerVisible(false);
      },
    },
    {
      key: "/settings",
      icon: <SettingOutlined />,
      label: <Link href="/settings">系统设置</Link>,
      onClick: () => {
        if (isMobile) setDrawerVisible(false);
      },
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    if (pathname === "/dashboard" || pathname === "/") return "/dashboard";
    if (pathname.startsWith("/investment-directions"))
      return "/investment-directions";
    if (pathname.startsWith("/settings")) return "/settings";
    return "/dashboard";
  };

  // 侧边栏内容
  const sidebarContent = (
    <>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isMobile ? "#000" : "white",
          fontSize: isMobile ? 20 : collapsed ? 18 : 20,
          fontWeight: "bold",
          borderBottom: isMobile
            ? "1px solid #f0f0f0"
            : "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {collapsed && !isMobile ? "💰" : "💰 豆米理财"}
      </div>
      <Menu
        theme={isMobile ? "light" : "dark"}
        mode="inline"
        selectedKeys={[getSelectedKey()]}
        items={menuItems}
        style={{ borderRight: 0 }}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 移动端：抽屉式导航 */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
          width={250}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* 桌面端：固定侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : collapsed ? 80 : 200,
          transition: "all 0.2s",
        }}
      >
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <Button
            type="text"
            icon={
              isMobile ? (
                <MenuOutlined />
              ) : collapsed ? (
                <MenuUnfoldOutlined />
              ) : (
                <MenuFoldOutlined />
              )
            }
            onClick={() => {
              if (isMobile) {
                setDrawerVisible(true);
              } else {
                setCollapsed(!collapsed);
              }
            }}
            style={{
              fontSize: "16px",
              width: 64,
              height: 64,
            }}
          />
          <div
            style={{
              flex: 1,
              paddingRight: isMobile ? 8 : 24,
              textAlign: "right",
            }}
          >
            <Space>
              {!isMobile && (
                <span style={{ color: "#666" }}>个人投资管理系统</span>
              )}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Button type="text" style={{ height: 40, padding: "0 12px" }}>
                  <Space>
                    <Avatar
                      size="small"
                      icon={<UserOutlined />}
                      style={{ backgroundColor: "#1890ff" }}
                    />
                    {!isMobile && <span>{session?.user?.name || "用户"}</span>}
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? "16px 8px" : "24px 16px",
            padding: isMobile ? 16 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
