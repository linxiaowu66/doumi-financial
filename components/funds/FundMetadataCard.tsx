"use client";

import { Card, Col, Empty, Progress, Row, Table, Tag } from "antd";
import type { Fund } from "@/types/fund";

type Metadata = {
  assetAllocation?: { series?: Array<{ name?: string; data?: number[] }>; categories?: string[] };
  holdings?: Array<{ code?: string; name?: string; weight?: number | null }>;
};

export default function FundMetadataCard({ fund }: { fund: Fund }) {
  let metadata: Metadata = {};
  try { metadata = fund.metadataJson ? JSON.parse(fund.metadataJson) as Metadata : {}; } catch { metadata = {}; }
  const allocation = (metadata.assetAllocation?.series ?? []).filter((item) => item.name && item.data?.length).map((item) => ({ name: item.name!, value: Number(item.data!.at(-1)), date: metadata.assetAllocation?.categories?.at(-1) }));
  const holdings = (metadata.holdings ?? []).filter((item) => item.name);

  return <Card title="基金官方资料" style={{ marginBottom: 24 }}>
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col xs={24} md={8}><div style={{ color: "#888" }}>官方分类</div><Tag color="blue" style={{ marginTop: 6 }}>{fund.actualCategory || "暂无数据"}</Tag></Col>
      <Col xs={24} md={8}><div style={{ color: "#888" }}>披露日期</div><div style={{ marginTop: 6 }}>{fund.metadataAsOf || "暂无数据"}</div></Col>
      <Col xs={24} md={8}><div style={{ color: "#888" }}>资料更新</div><div style={{ marginTop: 6 }}>{fund.metadataFetchedAt ? new Date(fund.metadataFetchedAt).toLocaleString("zh-CN") : "暂无数据"}</div></Col>
    </Row>
    {allocation.length > 0 && <div style={{ marginBottom: 18 }}><div style={{ fontWeight: 500, marginBottom: 8 }}>资产配置（最近披露期：{allocation[0].date || "未知"}）</div>{allocation.map((item) => <div key={item.name} style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 5 }}><span style={{ width: 110 }}>{item.name}</span><Progress percent={Math.max(0, Math.min(100, item.value))} size="small" style={{ flex: 1 }} /><span style={{ width: 55, textAlign: "right" }}>{item.value.toFixed(2)}%</span></div>)}</div>}
    {holdings.length > 0 ? <Table size="small" pagination={false} rowKey={(row) => `${row.code}-${row.name}`} dataSource={holdings} columns={[{ title: "底层资产", dataIndex: "name" }, { title: "代码", dataIndex: "code", render: (value: string) => value || "-" }, { title: "披露占比", dataIndex: "weight", render: (value: number | null) => value == null ? "-" : `${value.toFixed(2)}%` }]} /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无前十大持仓披露数据" />}
    <div style={{ color: "#999", fontSize: 12, marginTop: 10 }}>资料来自公开基金详情页，属于定期披露快照，不代表实时持仓。</div>
  </Card>;
}
