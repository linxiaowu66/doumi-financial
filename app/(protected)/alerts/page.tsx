"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, List, Row, Space, Spin, Statistic, Tabs, Tag, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import AlertsOverview from "@/components/investment-directions/AlertsOverview";
import type { FundAlert } from "@/types/investment-direction";

const { Title, Text } = Typography;

type ActionSignal = { fundId: number; fundName: string; directionName: string; action: "BUY" | "SELL" | "NONE"; actionAmount: number; signal: string; signalRank: number; score: number; reason: string; strategyType: "CORE" | "TREND"; dataDate: string | null };
type PortfolioRisk = { directionId: number; directionName: string; budgetUsedPercent: number; concentrationHHI: number; categoryConcentrationHHI: number; averageCorrelation: number | null; highestCorrelation: number | null; stressTests: Array<{ name: string; estimatedLoss: number; note: string }>; dataQuality: { totalFunds: number; heldFunds: number; freshFunds: number; insufficientFunds: number; staleMetadataFunds: number; categoryReviewFunds: number } };
type BacktestResult = { fundName: string; enoughData: boolean; observations: number; strategy?: { annualizedReturn: number; annualizedVolatility: number; sharpe: number | null; maxDrawdown: number; trades: number; turnover: number }; buyAndHold?: { annualizedReturn: number; annualizedVolatility: number; maxDrawdown: number } };

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FundAlert[]>([]);
  const [directionId, setDirectionId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<ActionSignal[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioRisk[]>([]);
  const [backtest, setBacktest] = useState<BacktestResult[]>([]);
  const [backtestMessage, setBacktestMessage] = useState<string | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);

  const runBacktest = async () => {
    setBacktestLoading(true);
    try {
      const response = await fetch("/api/fund-signals/backtest");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "回测失败");
      setBacktest(data.results ?? []);
      setBacktestMessage(data.message ?? null);
    } catch (error) {
      setBacktest([]);
      setBacktestMessage(error instanceof Error ? error.message : "回测失败，请稍后重试");
    } finally {
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([fetch("/api/investment-directions/alerts"), fetch("/api/fund-signals")])
      .then(async ([alertsResponse, signalsResponse]) => {
        const [alertData, signalData] = await Promise.all([alertsResponse.json(), signalsResponse.json()]);
        setAlerts(alertData);
        setSignals(signalData.signals ?? []);
        setPortfolio(signalData.portfolio ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const directionOptions = useMemo(
    () => [
      { label: "全部投资方向", value: "all" },
      ...Array.from(
        new Map(
          [...alerts.map((alert) => [alert.directionId, alert.directionName] as const), ...portfolio.map((item) => [item.directionId, item.directionName] as const)],
        ),
      ).map(([value, label]) => ({ label, value })),
    ],
    [alerts, portfolio],
  );

  const visibleAlerts =
    directionId === "all"
      ? alerts
      : alerts.filter((alert) => alert.directionId === directionId);

  return (
    <div style={{ minHeight: "100vh", padding: "24px", background: "#f5f5f5" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <WarningOutlined style={{ marginRight: 8 }} />策略与风险
              </Title>
              <Text type="secondary">把行动信号、组合风险和交易提醒收口到一个页面</Text>
            </div>
            <Tabs
              activeKey={String(directionId)}
              onChange={(key) => setDirectionId(key === "all" ? "all" : Number(key))}
              items={directionOptions.map((option) => ({
                key: String(option.value),
                label: option.label,
              }))}
              tabBarStyle={{ marginBottom: 0, overflowX: "auto" }}
            />
          </Space>
        </Card>

        {loading ? (
          <Card style={{ textAlign: "center", padding: 32 }}><Spin /></Card>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            {portfolio.filter((item) => directionId === "all" || item.directionId === directionId).map((item) => (
              <Card key={item.directionId} title={`${item.directionName} · 组合风险`}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}><Statistic title="预算使用" value={item.budgetUsedPercent} precision={1} suffix="%" /></Col>
                  <Col xs={12} sm={6}><Statistic title="基金集中度 HHI" value={item.concentrationHHI} precision={1} /></Col>
                  <Col xs={12} sm={6}><Statistic title="分类集中度 HHI" value={item.categoryConcentrationHHI} precision={1} /></Col>
                  <Col xs={12} sm={6}><Statistic title="平均相关性" value={item.averageCorrelation ?? 0} precision={1} suffix={item.averageCorrelation === null ? "不足" : "%"} /></Col>
                </Row>
                <Text type="secondary">当前持仓：{item.dataQuality.heldFunds}/{item.dataQuality.totalFunds}；持仓数据新鲜：{item.dataQuality.freshFunds}/{item.dataQuality.heldFunds}；净值不足：{item.dataQuality.insufficientFunds}；资料待更新：{item.dataQuality.staleMetadataFunds}；个人分类与官方分类有差异：{item.dataQuality.categoryReviewFunds}。</Text>
                <div style={{ marginTop: 6 }}><Text type="secondary">压力测试（假设当前持仓某类资产下跌，不是收益预测）：{item.stressTests.map((test) => `${test.name}约 -¥${test.estimatedLoss.toLocaleString()}`).join("；")}</Text></div>
              </Card>
            ))}
            <Card title="今日买入 / 卖出信号">
              <List dataSource={signals.filter((item) => item.action !== "NONE" && item.actionAmount > 0 && (directionId === "all" || portfolio.some((risk) => risk.directionId === directionId && risk.directionName === item.directionName))).sort((a, b) => b.signalRank - a.signalRank)} locale={{ emptyText: "当前没有明确的买入或卖出信号" }} renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta title={`${item.fundName} · ${item.directionName}`} description={`${item.strategyType === "TREND" ? "高风险趋势" : "长期核心"} · 评分 ${item.score}/100 · ${item.reason} · T-1：${item.dataDate || "无"}`} />
                  <Tag color={item.action === "SELL" ? "red" : "green"}>{item.action === "SELL" ? "卖出" : "买入"} ¥{item.actionAmount.toLocaleString()}</Tag>
                </List.Item>
              )} />
            </Card>
            <Card title="趋势规则回测" extra={<Button size="small" loading={backtestLoading} onClick={runBacktest}>运行回测</Button>}>
              {backtest.length === 0 ? <Text type="secondary">{backtestMessage || "用于比较趋势规则和买入并持有，不代表未来收益。"}</Text> : <List size="small" dataSource={backtest} renderItem={(item) => <List.Item><List.Item.Meta title={item.fundName} description={item.enoughData ? `样本 ${item.observations} 个净值点 · 趋势年化 ${item.strategy?.annualizedReturn.toFixed(2)}% / 波动 ${item.strategy?.annualizedVolatility.toFixed(2)}% / 夏普 ${item.strategy?.sharpe?.toFixed(2) ?? "不足"} / 最大回撤 ${item.strategy?.maxDrawdown.toFixed(2)}% / 交易 ${item.strategy?.trades} 次 · 买入并持有年化 ${item.buyAndHold?.annualizedReturn.toFixed(2)}% / 最大回撤 ${item.buyAndHold?.maxDrawdown.toFixed(2)}%` : `数据不足（${item.observations} 个净值点）`} /></List.Item>} />}
            </Card>
            {visibleAlerts.length > 0 ? <AlertsOverview alerts={visibleAlerts} loading={false} /> : <Alert type="success" message="当前没有额外的交易或资料提醒" showIcon />}
          </Space>
        )}
      </div>
    </div>
  );
}
