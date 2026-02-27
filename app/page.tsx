"use client";

import Link from "next/link";
import { Button, Layout, Typography, Space, Row, Col } from "antd";
import {
  RocketOutlined,
  LineChartOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  DollarOutlined,
  FundOutlined,
} from "@ant-design/icons";

// 模拟仪表盘组件 - 仿照实际 Dashboard UI
const MockDashboard = () => (
  <div className="relative rounded-xl bg-gray-50 dark:bg-[#141414] shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden select-none transform transition-transform duration-500 hover:scale-[1.02] text-left font-sans">
    {/* Window Header */}
    <div className="bg-white dark:bg-[#1f1f1f] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-2">
      <div className="w-3 h-3 rounded-full bg-[#ff4d4f]" />
      <div className="w-3 h-3 rounded-full bg-[#ffc53d]" />
      <div className="w-3 h-3 rounded-full bg-[#52c41a]" />
      <div className="ml-4 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-md text-xs text-gray-500 dark:text-gray-400 font-mono flex-1 text-center truncate">
        doumi-financial.com/dashboard
      </div>
    </div>

    {/* Dashboard Content */}
    <div className="p-6 bg-[#f5f5f5] dark:bg-black min-h-[400px]">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-medium text-black dark:text-white flex items-center gap-2 m-0">
          <DollarOutlined /> 投资概览
        </h1>
        <Button
          type="primary"
          size="small"
          icon={<ArrowUpOutlined rotate={45} />}
        >
          更新所有净值
        </Button>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            title: "投资方向",
            val: "4",
            suffix: "个",
            icon: <FundOutlined />,
            color: "#1890ff",
          },
          {
            title: "管理基金",
            val: "12",
            suffix: "只",
            icon: <LineChartOutlined />,
            color: "#52c41a",
          },
          { title: "预期投入", val: "500,000", prefix: "¥", color: "#faad14" },
          { title: "实际投入", val: "215,800", prefix: "¥", color: "#722ed1" },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#1f1f1f] p-4 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              {item.title}
            </div>
            <div className="text-2xl font-medium" style={{ color: item.color }}>
              {item.prefix && (
                <span className="text-lg mr-1">{item.prefix}</span>
              )}
              {item.icon && <span className="text-lg mr-2">{item.icon}</span>}
              {item.val}
              {item.suffix && (
                <span className="text-sm ml-1 text-gray-500">
                  {item.suffix}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Stats Row 2 (Profit) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            今日盈亏
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[#cf1322] text-3xl font-bold">+1,240.50</span>
            <span className="text-gray-500 dark:text-gray-400">(+0.58%)</span>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            累计盈亏
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[#cf1322] text-3xl font-bold">
              +32,850.20
            </span>
            <span className="text-gray-500 dark:text-gray-400">(+15.22%)</span>
          </div>
        </div>
      </div>

      {/* List Preview */}
      <div className="bg-white dark:bg-[#1f1f1f] rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 font-medium flex justify-between">
          <span>投资方向列表</span>
          <Button type="primary" size="small" icon={<PlusOutlined />}>
            管理投资方向
          </Button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Direction Card 1 */}
          <div className="border border-gray-200 dark:border-gray-800 rounded p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-4 font-medium text-base">
              <FundOutlined /> 养老金账户
            </div>
            <div className="flex justify-between mb-2">
              <div>
                <div className="text-xs text-gray-500">预期投入</div>
                <div className="text-base font-medium">¥200,000</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">实际投入</div>
                <div className="text-base font-medium">¥85,000</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className="bg-[#1890ff] h-1.5 rounded-full"
                style={{ width: "42.5%" }}
              ></div>
            </div>
            <div className="text-xs text-gray-400">4 只基金</div>
          </div>
          {/* Direction Card 2 */}
          <div className="border border-gray-200 dark:border-gray-800 rounded p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-2 mb-4 font-medium text-base">
              <FundOutlined /> 子女教育
            </div>
            <div className="flex justify-between mb-2">
              <div>
                <div className="text-xs text-gray-500">预期投入</div>
                <div className="text-base font-medium">¥300,000</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">实际投入</div>
                <div className="text-base font-medium">¥130,800</div>
              </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className="bg-[#1890ff] h-1.5 rounded-full"
                style={{ width: "43.6%" }}
              ></div>
            </div>
            <div className="text-xs text-gray-400">8 只基金</div>
          </div>
          {/* Direction Card 3 */}
          <div className="border border-gray-200 dark:border-gray-800 rounded p-4 border-dashed flex flex-col items-center justify-center text-gray-400 min-h-[140px]">
            <PlusOutlined className="text-2xl mb-2" />
            <span>创建新方向</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// 模拟资产分布组件 - 仿照实际 Card UI
const MockAllocationCard = () => (
  <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-md mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-300 font-sans text-left">
    <h3 className="text-base font-medium mb-6 text-black dark:text-white border-l-4 border-[#1890ff] pl-3">
      资产分布
    </h3>
    <div className="space-y-6">
      {[
        {
          name: "养老金账户",
          val: "¥ 85,000",
          percent: 42.5,
          color: "#1890ff",
        },
        { name: "子女教育", val: "¥ 130,800", percent: 65.4, color: "#52c41a" },
      ].map((item) => (
        <div key={item.name}>
          <div className="flex justify-between items-end mb-2">
            <span className="text-gray-600 dark:text-gray-300 font-medium">
              {item.name}
            </span>
            <span className="text-gray-900 dark:text-gray-100 font-bold">
              {item.val}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: item.color,
                }}
              ></div>
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">
              {item.percent}%
            </span>
          </div>
        </div>
      ))}
      <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center text-gray-500">
          <span>总资产</span>
          <span className="text-xl font-bold text-black dark:text-white">
            ¥ 215,800
          </span>
        </div>
      </div>
    </div>
  </div>
);

// 模拟基金详情组件 - 仿照实际 List/Table UI
const MockFundCard = () => (
  <div className="bg-white dark:bg-[#1f1f1f] rounded-lg shadow-xl border border-gray-200 dark:border-gray-800 w-full max-w-md mx-auto overflow-hidden transform rotate-[2deg] hover:rotate-0 transition-transform duration-300 font-sans text-left">
    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#141414]">
      <div>
        <div className="font-medium text-base text-gray-900 dark:text-gray-100">
          招商中证白酒
        </div>
        <div className="text-xs text-gray-500 mt-1">161725</div>
      </div>
      <div className="text-right">
        <div className="text-[#cf1322] font-bold text-lg">+2.45%</div>
        <div className="text-xs text-gray-400">2026-02-27</div>
      </div>
    </div>
    <div className="p-6">
      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        <div>
          <div className="text-xs text-gray-500 mb-1">持有金额</div>
          <div className="text-base font-medium">¥ 12,580.00</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">持有收益</div>
          <div className="text-base font-medium text-[#cf1322]">+1,205.40</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">持仓成本</div>
          <div className="text-base font-medium">0.8542</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">最新净值</div>
          <div className="text-base font-medium">0.9856</div>
        </div>
      </div>

      <div className="mt-6 p-3 bg-[#fff1f0] dark:bg-[#2a1215] border border-[#ffa39e] dark:border-[#58181c] rounded text-sm flex items-start gap-2">
        <SafetyCertificateOutlined className="text-[#cf1322] mt-0.5" />
        <div>
          <div className="font-medium text-[#cf1322]">止盈提醒</div>
          <div className="text-xs text-[#cf1322] opacity-80 mt-0.5">
            当前收益率 15.2%，已超过目标 15%
          </div>
        </div>
      </div>
    </div>
    <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#141414] flex justify-between">
      <Button size="small">交易记录</Button>
      <Button type="primary" size="small" danger>
        卖出
      </Button>
    </div>
  </div>
);

export default function LandingPage() {
  return (
    <Layout className="min-h-screen bg-transparent">
      {/* Background with gradient */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        {/* Blue Blob */}
        <div className="absolute left-[-10%] top-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-blue-400 opacity-20 blur-[120px] dark:bg-blue-900 animate-pulse"></div>
        {/* Purple Blob */}
        <div
          className="absolute right-[-10%] bottom-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-purple-400 opacity-20 blur-[120px] dark:bg-purple-900 animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      <Layout.Header className="flex items-center justify-between bg-transparent px-6 md:px-12 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100/10">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
            豆米理财
          </span>
        </div>
        <Link href="/auth/signin">
          <Button
            type="primary"
            icon={<LoginOutlined />}
            shape="round"
            size="large"
          >
            登录
          </Button>
        </Link>
      </Layout.Header>

      <Layout.Content className="px-6 md:px-12 py-12 md:py-20">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
              全新一代个人财富管理系统
            </div>
            <Typography.Title
              level={1}
              className="!text-5xl md:!text-7xl !mb-6 !font-extrabold tracking-tight"
            >
              掌握财富 <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500">
                智绘未来
              </span>
            </Typography.Title>
            <Typography.Paragraph className="text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              豆米理财帮助您轻松追踪基金收益、管理投资组合，让每一分收益都清晰可见。
              简单、高效、安全，您的私人财富管家。
            </Typography.Paragraph>
            <Space size="large" direction="vertical" className="mb-16 w-full">
              <Space size="large">
                <Link href="/auth/signin">
                  <Button
                    type="primary"
                    size="large"
                    shape="round"
                    className="h-12 px-8 text-lg shadow-xl shadow-blue-500/20"
                  >
                    立即登录
                  </Button>
                </Link>
                <Link
                  href="https://github.com/linxiaowu66/doumi-financial"
                  target="_blank"
                >
                  <Button
                    size="large"
                    shape="round"
                    className="h-12 px-8 text-lg"
                  >
                    了解更多
                  </Button>
                </Link>
              </Space>
              <Typography.Text type="secondary" className="block mt-4">
                * 如需体验，请联系官方作者
              </Typography.Text>
            </Space>

            {/* Mock Dashboard Preview */}
            <div className="relative mx-auto max-w-5xl perspective-1000">
              <div className="transform rotate-x-12 hover:rotate-x-0 transition-all duration-700 ease-out shadow-2xl rounded-xl">
                <MockDashboard />
              </div>
              {/* Reflection/Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 blur-2xl -z-10"></div>
            </div>
          </div>

          {/* Features Grid */}
          <Row gutter={[32, 32]} className="mb-24 mt-32">
            <Col xs={24} md={8}>
              <div className="group p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="h-14 w-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 text-2xl group-hover:scale-110 transition-transform">
                  <LineChartOutlined />
                </div>
                <Typography.Title level={4} className="!mb-4">
                  收益追踪
                </Typography.Title>
                <Typography.Text className="text-gray-500 dark:text-gray-400 block leading-7">
                  实时更新基金净值，自动计算持有收益与收益率。支持多维度图表分析，让您的每一笔投资回报都一目了然。
                </Typography.Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="group p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="h-14 w-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 text-2xl group-hover:scale-110 transition-transform">
                  <RocketOutlined />
                </div>
                <Typography.Title level={4} className="!mb-4">
                  智能管理
                </Typography.Title>
                <Typography.Text className="text-gray-500 dark:text-gray-400 block leading-7">
                  支持自定义投资方向，灵活配置资产组合。自动化的定投提醒与目标止盈功能，助您科学决策，稳健增值。
                </Typography.Text>
              </div>
            </Col>
            <Col xs={24} md={8}>
              <div className="group p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-300 hover:-translate-y-1 h-full">
                <div className="h-14 w-14 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl flex items-center justify-center mb-6 text-cyan-600 dark:text-cyan-400 text-2xl group-hover:scale-110 transition-transform">
                  <SafetyCertificateOutlined />
                </div>
                <Typography.Title level={4} className="!mb-4">
                  安全私密
                </Typography.Title>
                <Typography.Text className="text-gray-500 dark:text-gray-400 block leading-7">
                  数据本地化部署，完全掌控自己的财务数据。基于 Next.js 与 Prisma
                  构建，安全可靠，不仅好用，更放心。
                </Typography.Text>
              </div>
            </Col>
          </Row>

          {/* Deep Dive Section */}
          <div className="mb-24 space-y-32">
            {/* Feature 1: Asset Allocation */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
              <div className="w-full md:w-1/2 order-2 md:order-1 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 rounded-full blur-3xl -z-10"></div>
                <MockAllocationCard />
              </div>
              <div className="w-full md:w-1/2 order-1 md:order-2">
                <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-purple-600 uppercase bg-purple-50 rounded-full dark:bg-purple-900/30 dark:text-purple-400">
                  资产配置
                </div>
                <Typography.Title level={2} className="!mb-6">
                  多维度资产规划 <br />
                  <span className="text-blue-600">灵活掌控投资方向</span>
                </Typography.Title>
                <Typography.Paragraph className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  不仅仅是记账，豆米理财帮助您建立科学的资产配置体系。您可以自定义多个投资方向（如：养老金、子女教育、短期理财），并为每个方向设定目标金额和持仓比例。
                </Typography.Paragraph>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>自定义投资组合与策略</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>实时监控持仓比例偏离度</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span>智能计算补仓金额建议</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Fund Details */}
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24">
              <div className="w-full md:w-1/2">
                <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-green-600 uppercase bg-green-50 rounded-full dark:bg-green-900/30 dark:text-green-400">
                  深度分析
                </div>
                <Typography.Title level={2} className="!mb-6">
                  透视每一笔交易 <br />
                  <span className="text-green-600">告别糊涂账</span>
                </Typography.Title>
                <Typography.Paragraph className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  自动同步基金净值，精准计算每一次买入、卖出、分红后的持有成本。系统会自动识别长期持有的“僵尸”基金，并提供智能的止盈止损提醒，助您在大起大落的市场中保持理性。
                </Typography.Paragraph>
                <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span>精准的复权净值与收益计算</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span>自动化的止盈与止损监控</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span>完整的交易历史复盘</span>
                  </li>
                </ul>
              </div>
              <div className="w-full md:w-1/2 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-green-500/10 rounded-full blur-3xl -z-10"></div>
                <MockFundCard />
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center py-12 md:py-24 border-t border-gray-100 dark:border-gray-800">
            <Typography.Title level={2} className="!mb-6">
              准备好开启财富之旅了吗？
            </Typography.Title>
            <Space direction="vertical" size="middle">
              <Link href="/auth/signin">
                <Button
                  type="primary"
                  size="large"
                  shape="round"
                  className="h-14 px-10 text-xl font-medium shadow-lg shadow-blue-500/30"
                >
                  立即登录
                </Button>
              </Link>
              <Typography.Text type="secondary" className="block mt-2">
                * 如需体验，请联系官方作者
              </Typography.Text>
            </Space>
          </div>
        </div>
      </Layout.Content>

      <Layout.Footer className="text-center bg-transparent border-t border-gray-100 dark:border-gray-800 text-gray-400 py-8">
        Doumi Financial ©{new Date().getFullYear()} Created by Linxiaowu
      </Layout.Footer>
    </Layout>
  );
}
