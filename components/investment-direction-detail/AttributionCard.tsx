"use client";

import { Card, Col, Row, Statistic, Table, Tag } from "antd";
import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Attribution = { fundId: number; fundName: string; category: string; actualCategory: string | null; metadataAsOf: string | null; marketValue: number; weight: number; holdingProfit: number; realizedProfit: number; dividends: number; fees: number; totalProfit: number };

export default function AttributionCard({ directionId }: { directionId: number }) {
  const [data, setData] = useState<{ totalValue: number; totalProfit: number; maxDrawdown: number; volatility: number; sharpe: number | null; recoveryDays: number; downsideDays: number; dataCoverageDays: number; concentration: number; funds: Attribution[] } | null>(null);
  useEffect(() => { fetch(`/api/investment-directions/${directionId}/attribution`).then((res) => res.ok ? res.json() : null).then(setData).catch(() => undefined); }, [directionId]);
  if (!data) return null;
  const pieData = data.funds.filter((fund) => fund.weight > 0).map((fund) => ({ name: fund.fundName, value: fund.weight }));
  const pieColors = ["#1677ff", "#36cfc9", "#52c41a", "#faad14", "#f5222d", "#722ed1", "#eb2f96", "#13c2c2", "#fa8c16", "#2f54eb"];
  return <Card title="收益归因与风险" style={{ marginBottom: 24 }}>
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} md={6}><Statistic title="组合市值" value={data.totalValue} precision={2} prefix="¥" /></Col>
      <Col xs={12} md={6}><Statistic title="组合收益" value={data.totalProfit} precision={2} prefix="¥" /></Col>
      <Col xs={12} md={6}><Statistic title="最大回撤" value={Math.abs(data.maxDrawdown)} precision={2} suffix="%" valueStyle={{ color: "#cf1322" }} /></Col>
      <Col xs={12} md={6}><Statistic title="年化波动率" value={data.volatility} precision={2} suffix="%" /></Col>
      <Col xs={12} md={6}><Statistic title="夏普比率" value={data.sharpe ?? "数据不足"} precision={2} /></Col>
    </Row>
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={12} md={6}><Statistic title="最长回撤修复" value={data.recoveryDays} suffix="天" /></Col>
      <Col xs={12} md={6}><Statistic title="下跌日" value={data.downsideDays} suffix="天" /></Col>
      <Col xs={12} md={6}><Statistic title="组合集中度 HHI" value={data.concentration} precision={2} suffix="%" /></Col>
      <Col xs={12} md={6}><Statistic title="有效数据天数" value={data.dataCoverageDays} suffix="天" /></Col>
    </Row>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 500, marginBottom: 8 }}>当前持仓结构</div>
      {pieData.length > 0 ? <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="38%" cy="50%" innerRadius={72} outerRadius={112} paddingAngle={2} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}>
            {pieData.map((item, index) => <Cell key={item.name} fill={pieColors[index % pieColors.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "市值权重"]} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ maxWidth: "48%", lineHeight: "22px" }} />
        </PieChart>
      </ResponsiveContainer> : <div style={{ color: "#999", padding: 24 }}>暂无持仓市值数据</div>}
    </div>
    <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>风险指标基于系统已记录的投资方向市值序列；没有足够历史数据时不推断指标。HHI 越高表示集中度越高。</div>
    <Table rowKey="fundId" size="small" pagination={false} scroll={{ x: 760 }} dataSource={data.funds} columns={[
      { title: "资产", dataIndex: "fundName" },
      { title: "个人分类", dataIndex: "category", render: (value: string) => <Tag>{value}</Tag> },
      { title: "官方分类", dataIndex: "actualCategory", render: (value: string | null) => value ? <Tag color="blue">{value}</Tag> : <span style={{ color: "#999" }}>未同步</span> },
      { title: "市值权重", dataIndex: "weight", render: (value: number) => `${value.toFixed(2)}%` },
      { title: "持仓收益", dataIndex: "holdingProfit", render: (value: number) => `¥${value.toFixed(2)}` },
      { title: "已实现", dataIndex: "realizedProfit", render: (value: number) => `¥${value.toFixed(2)}` },
      { title: "分红", dataIndex: "dividends", render: (value: number) => `¥${value.toFixed(2)}` },
      { title: "费用", dataIndex: "fees", render: (value: number) => `¥${value.toFixed(2)}` },
    ]} />
  </Card>;
}
