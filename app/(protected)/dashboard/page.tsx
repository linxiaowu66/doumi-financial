"use client";

import {
  Card,
  Row,
  Col,
  Statistic,
  Empty,
  Button,
  Space,
  App,
  Alert,
  Modal,
  List,
  Spin,
  Tag,
} from "antd";
import {
  FundOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  PlusOutlined,
  SyncOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import dayjs from "dayjs";
import { analyzeStrategyWithAi, type AiProvider } from "@/lib/ai-client";

interface DirectionSummary {
  id: number;
  name: string;
  type: "FUND" | "STOCK";
  expectedAmount: string;
  actualAmount: string;
  _count: {
    funds: number;
  };
}

interface DashboardSummary {
  totalProfit: string; // 累计盈亏
  totalProfitRate: string; // 累计盈亏率(%)
  todayProfit: string; // 最近交易日盈亏
  todayProfitRate: string; // 最近交易日盈亏率(%)
  monthProfit: string; // 本月盈亏
  monthProfitRate: string; // 本月盈亏率(%)
  yearProfit: string; // 今年盈亏
  yearProfitRate: string; // 今年盈亏率(%)
  annualTargetAmount?: string; // 本年度盈利目标
  targetGap?: string;
  remainingDays?: number;
  requiredReturnRate?: string;
  lastTradeDate: string; // 最近交易日日期
  totalCurrentValue: string; // 当前总市值
  totalCost: string; // 持仓总成本
  totalInvested: string; // 历史总投入
  directionCount: number; // 投资方向数量
  directionStats: Record<
    number,
    {
      holdingProfit: string;
      totalProfitRate: string;
      monthProfit: string;
      yesterdayProfit?: string;
    }
  >;
}

interface UpdateResult {
  fundName: string;
  code: string;
  success: boolean;
  netWorth?: string;
  netWorthDate?: string;
  error?: string;
}

interface FundSignal {
  fundId: number;
  fundName: string;
  directionName: string;
  signal: string;
  signalRank: number;
  score: number;
  reason: string;
  strategyType: "CORE" | "TREND";
  trend: string;
  return5: number;
  return20: number;
  return60: number;
  weight: number;
  currentDrawdown: number;
  volatility20: number | null;
  targetPercent: number | null;
  dataPoints: number;
  dataDate?: string | null;
}

interface PortfolioRisk {
  directionId: number;
  directionName: string;
  expectedAmount: number;
  investedAmount: number;
  marketValue: number;
  budgetUsedPercent: number;
  concentrationHHI: number;
  categoryConcentrationHHI: number;
  averageCorrelation: number | null;
  highestCorrelation: number | null;
  stressTests: Array<{ name: string; estimatedLoss: number; note: string }>;
  signalCounts: Record<string, number>;
  dataQuality: { totalFunds: number; heldFunds: number; freshFunds: number; insufficientFunds: number; staleMetadataFunds: number; categoryReviewFunds: number };
}

export default function HomePage() {
  const { message } = App.useApp();
  const { status } = useSession();
  const router = useRouter();
  const [directions, setDirections] = useState<DirectionSummary[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [analyzingStrategy, setAnalyzingStrategy] = useState(false);
  const [strategyReport, setStrategyReport] = useState<string | null>(null);
  const [strategyHistory, setStrategyHistory] = useState<Array<{ id: number; content: string; createdAt: string }>>([]);
  const [fundSignals, setFundSignals] = useState<FundSignal[]>([]);
  const [portfolioRisks, setPortfolioRisks] = useState<PortfolioRisk[]>([]);
  const [signalAsOfDate, setSignalAsOfDate] = useState<string | null>(null);
  const displayLastTradeDate = summary?.lastTradeDate || "";

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      loadDirections();
      loadSummary();
      loadFundSignals();
    }
  }, [status, router]);

  const loadDirections = async () => {
    try {
      const response = await fetch("/api/investment-directions");
      const data = await response.json();
      setDirections(data);
    } catch (error) {
      console.error("加载投资方向失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch("/api/dashboard/summary");
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("加载汇总数据失败:", error);
    }
  };

  // 批量更新净值
  const handleBatchUpdateNetWorth = async () => {
    const totalFunds = directions.reduce(
      (sum, d) => sum + (d._count?.funds || 0),
      0,
    );

    if (totalFunds === 0) {
      message.warning("暂无资产需要更新");
      return;
    }

    Modal.confirm({
      title: "批量更新最新净值/股价",
      content: `即将更新 ${totalFunds} 个资产的最新价格，每只资产间隔 0.5 秒请求，预计需要 ${Math.ceil(
        (totalFunds * 0.5) / 60,
      )} 分钟。是否继续？`,
      okText: "开始更新",
      cancelText: "取消",
      onOk: () => {
        return new Promise(async (resolve, reject) => {
          setUpdating(true);
          setUpdateResults([]);

          try {
            const response = await fetch("/api/funds/batch-update-networth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });

            const data = await response.json();

            if (response.ok) {
              setUpdateResults(data.results);
              setShowResultModal(true);
              message.success(data.message);
              // 刷新投资方向数据和汇总数据
              loadDirections();
              loadSummary();
            } else {
              message.error(data.error || "更新失败");
            }
          } catch {
            message.error("更新失败，请重试");
          } finally {
            setUpdating(false);
            resolve(true);
          }
        });
      },
    });
  };

  const loadStrategyHistory = async () => {
    const response = await fetch("/api/strategy-analyses");
    if (!response.ok) throw new Error("获取策略分析历史失败");
    setStrategyHistory(await response.json());
  };

  const loadFundSignals = async () => {
    try {
      const response = await fetch("/api/fund-signals");
      if (response.ok) {
        const result = await response.json();
        setFundSignals(result.signals ?? []);
        setPortfolioRisks(result.portfolio ?? []);
        setSignalAsOfDate(result.asOfDate ?? null);
      }
    } catch (error) {
      console.error("加载基金信号失败:", error);
    }
  };

  const actionableFundSignals = fundSignals.filter((item) => item.signal === "分批买入观察" || item.signal === "分批卖出");
  const insufficientSignalCount = fundSignals.filter((item) => item.signal === "数据不足").length;

  const handleOpenStrategyAnalysis = async () => {
    setStrategyModalOpen(true);
    setStrategyReport(null);
    try {
      await loadStrategyHistory();
    } catch {
      message.error("获取策略分析历史失败");
    }
  };

  const handleStrategyAnalysis = async () => {
    try {
      setAnalyzingStrategy(true);
      const [assetResults, alertsResponse, settingsResponse, summaryResponse] = await Promise.all([
        Promise.all(
          directions.map(async (direction) => {
            const response = await fetch(`/api/investment-directions/${direction.id}/analyze`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "获取资产数据失败");
            return data.accountData;
          }),
        ),
        fetch("/api/investment-directions/alerts"),
        fetch("/api/settings/system"),
        fetch("/api/dashboard/summary"),
      ]);
      const alerts = await alertsResponse.json();
      const settings = await settingsResponse.json();
      const summaryData = await summaryResponse.json();
      if (!alertsResponse.ok || !settingsResponse.ok || !summaryResponse.ok) throw new Error("获取策略分析数据失败");

      const provider = (settings.ai_provider || "gemini") as AiProvider;
      const report = await analyzeStrategyWithAi(provider, settings, {
        generatedAt: new Date().toISOString(),
        directions: assetResults,
        alerts,
        goal: {
          annualTargetAmount: summaryData.annualTargetAmount,
          yearProfit: summaryData.yearProfit,
          targetGap: summaryData.targetGap,
          remainingDays: summaryData.remainingDays,
          requiredReturnRate: summaryData.requiredReturnRate,
          currentValue: summaryData.totalCurrentValue,
        },
      });
      if (typeof report !== "string" || !report.trim()) throw new Error("AI 未返回策略报告");

      const saveResponse = await fetch("/api/strategy-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: report }),
      });
      if (!saveResponse.ok) throw new Error("策略报告生成成功，但保存失败");
      setStrategyReport(report);
      await loadStrategyHistory();
      message.success("AI 策略分析完成");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "AI 策略分析失败");
    } finally {
      setAnalyzingStrategy(false);
    }
  };

  if (status === "loading" || loading) {
    return <div style={{ textAlign: "center", padding: 40 }}>加载中...</div>;
  }

  return (
    <App>
      <div>
        {/* 页面标题 */}
        <div style={{ marginBottom: isMobile ? 16 : 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              justifyContent: "space-between",
              alignItems: isMobile ? "stretch" : "center",
              gap: isMobile ? 12 : 0,
              marginBottom: 8,
            }}
          >
            <h1 style={{ fontSize: isMobile ? 20 : 24, margin: 0 }}>
              <DollarOutlined style={{ marginRight: 8 }} />
              投资概览
            </h1>
            <Space wrap>
              <Button
                icon={<RobotOutlined />}
                onClick={handleOpenStrategyAnalysis}
                block={isMobile}
              >
                AI 策略分析
              </Button>
              <Button
                type="primary"
                icon={<SyncOutlined spin={updating} />}
                onClick={handleBatchUpdateNetWorth}
                loading={updating}
                block={isMobile}
              >
                {updating ? "更新中..." : "更新所有净值"}
              </Button>
            </Space>
          </div>
          {!isMobile && (
            <p style={{ color: "#666", margin: 0 }}>
              欢迎使用豆米理财投资管理系统，管理您的投资组合
            </p>
          )}
        </div>

        {/* 功能卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="投资方向"
                value={directions.length}
                suffix="个"
                prefix={<FundOutlined />}
                styles={{
                  content: { color: "#1890ff", fontSize: isMobile ? 20 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="管理资产"
                value={directions.reduce(
                  (sum, d) => sum + (d._count?.funds || 0),
                  0,
                )}
                suffix="只"
                prefix={<LineChartOutlined />}
                styles={{
                  content: { color: "#52c41a", fontSize: isMobile ? 20 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="预期投入"
                value={directions.reduce(
                  (sum, d) => sum + parseFloat(d.expectedAmount),
                  0,
                )}
                precision={2}
                prefix="¥"
                styles={{
                  content: { color: "#faad14", fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="实际投入"
                value={directions.reduce(
                  (sum, d) => sum + parseFloat(d.actualAmount),
                  0,
                )}
                precision={2}
                prefix="¥"
                styles={{
                  content: { color: "#722ed1", fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
        </Row>

        {summary?.annualTargetAmount && parseFloat(summary.annualTargetAmount) > 0 && (
          <Card title="年度目标驾驶舱" style={{ marginBottom: isMobile ? 16 : 24 }}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}><Statistic title="目标缺口" value={parseFloat(summary.targetGap || "0")} precision={2} prefix="¥" valueStyle={{ color: parseFloat(summary.targetGap || "0") > 0 ? "#cf1322" : "#3f8600" }} /></Col>
              <Col xs={12} sm={6}><Statistic title="剩余天数" value={summary.remainingDays || 0} suffix="天" /></Col>
              <Col xs={12} sm={6}><Statistic title="按当前市值所需收益率" value={parseFloat(summary.requiredReturnRate || "0")} precision={2} suffix="%" valueStyle={{ color: parseFloat(summary.requiredReturnRate || "0") > 10 ? "#cf1322" : "#faad14" }} /></Col>
              <Col xs={12} sm={6}><Statistic title="目标完成度" value={Math.max(0, Math.min(100, (parseFloat(summary.yearProfit) / parseFloat(summary.annualTargetAmount)) * 100))} precision={1} suffix="%" /></Col>
            </Row>
            <div style={{ marginTop: 12, color: "#666", fontSize: 12 }}>
              该收益率只是基于当前市值的数学缺口，不代表收益承诺；实际投入字段表示持仓成本，不等同于可用现金。
            </div>
          </Card>
        )}

        <Card title="今日基金信号" extra={<span style={{ color: "#999", fontSize: 12 }}>T-1：{signalAsOfDate || "暂无"}</span>} style={{ marginBottom: isMobile ? 16 : 24 }}>
          {fundSignals.length === 0 ? <Empty description="暂无 T-1 信号数据，请先同步基金净值" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : actionableFundSignals.length === 0 ? (
            <Alert type="success" showIcon message={`已评估 ${fundSignals.length} 只基金，当前没有明确买入或卖出信号`} description={insufficientSignalCount > 0 ? `${insufficientSignalCount} 只基金历史数据不足；暂缓加仓和持有状态已隐藏。` : "暂缓加仓和持有状态已隐藏，避免干扰你的每日决策。"} />
          ) : (
            <List size="small" dataSource={actionableFundSignals.sort((a, b) => b.signalRank - a.signalRank).slice(0, 8)} renderItem={(item) => (
              <List.Item>
                <List.Item.Meta title={`${item.fundName} · ${item.directionName}`} description={<span>{item.strategyType === "TREND" ? "高风险趋势" : "长期核心"} · 评分 {item.score}/100 · {item.reason} · T-1：{item.dataDate || "无"}</span>} />
                <Tag color={item.signal.includes("卖出") || item.signal.includes("减仓") ? "red" : item.signal.includes("买入") ? "green" : "orange"}>{item.signal}</Tag>
              </List.Item>
            )} />
          )}
          <div style={{ color: "#999", fontSize: 12, marginTop: 8 }}>仅使用最近一个完整交易日（T-1）及以前的净值；高风险趋势资产才会触发减仓/分批卖出提示，不执行自动交易。</div>
        </Card>

        {portfolioRisks.length > 0 && (
          <Card title="组合风险与数据质量" extra={<Link href="/alerts">查看策略与风险明细</Link>} style={{ marginBottom: isMobile ? 16 : 24 }}>
            <Row gutter={[16, 16]}>
              {portfolioRisks.map((portfolio) => (
                <Col xs={24} lg={12} key={portfolio.directionId}>
                  <Card size="small" title={portfolio.directionName}>
                    <Row gutter={[12, 12]}>
                      <Col span={8}><Statistic title="预算使用" value={portfolio.budgetUsedPercent} precision={1} suffix="%" /></Col>
                      <Col span={8}><Statistic title="基金集中度 HHI" value={portfolio.concentrationHHI} precision={1} /></Col>
                      <Col span={8}><Statistic title="平均相关性" value={portfolio.averageCorrelation ?? 0} precision={1} suffix={portfolio.averageCorrelation === null ? "不足" : "%"} /></Col>
                    </Row>
                    <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
                      当前持仓：{portfolio.dataQuality.heldFunds}/{portfolio.dataQuality.totalFunds} 只；持仓数据新鲜：{portfolio.dataQuality.freshFunds}/{portfolio.dataQuality.heldFunds} 只；官方资料待更新：{portfolio.dataQuality.staleMetadataFunds} 只；个人分类与官方分类有差异：{portfolio.dataQuality.categoryReviewFunds} 只。
                    </div>
                    <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>压力测试（情景估算，不是收益预测）：{portfolio.stressTests.map((test) => `${test.name}约 -¥${test.estimatedLoss.toLocaleString()}`).join("；")}</div>
                  </Card>
                </Col>
              ))}
            </Row>
            <div style={{ color: "#999", fontSize: 12, marginTop: 8 }}>HHI 越高表示越集中；相关性越高表示基金可能同涨同跌。数据不足时不推断风险。</div>
          </Card>
        )}

        {/* 盈亏统计卡片 */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
            <Col xs={12} sm={12} lg={6}>
              <Card style={{ height: "100%" }}>
                <Statistic
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "flex-start" : "center",
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? 2 : 0,
                        height: isMobile ? 34 : undefined,
                      }}
                    >
                      <span>昨日盈亏</span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "#999",
                          fontWeight: "normal",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {displayLastTradeDate}
                      </span>
                    </div>
                  }
                  value={Math.abs(parseFloat(summary.todayProfit))}
                  precision={2}
                  prefix={
                    parseFloat(summary.todayProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      <FallOutlined />
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.todayProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: "bold",
                  }}
                />
                <div
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    color:
                      parseFloat(summary.todayProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    marginTop: 8,
                  }}
                >
                  ({parseFloat(summary.todayProfitRate) >= 0 ? "+" : ""}
                  {parseFloat(summary.todayProfitRate).toFixed(2)}%)
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card style={{ height: "100%" }}>
                <Statistic
                  title={
                    <div style={{ height: isMobile ? 34 : undefined }}>
                      <div>本月盈亏</div>
                      {isMobile && <div style={{ height: 16 }} />}
                    </div>
                  }
                  value={Math.abs(parseFloat(summary.monthProfit))}
                  precision={2}
                  prefix={
                    parseFloat(summary.monthProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      <FallOutlined />
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.monthProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: "bold",
                  }}
                />
                <div
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    color:
                      parseFloat(summary.monthProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    marginTop: 8,
                  }}
                >
                  ({parseFloat(summary.monthProfitRate) >= 0 ? "+" : ""}
                  {parseFloat(summary.monthProfitRate).toFixed(2)}%)
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card style={{ height: "100%" }}>
                <Statistic
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: isMobile ? "flex-start" : "center",
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? 2 : 0,
                        height: isMobile ? 34 : undefined,
                      }}
                    >
                      <span>今年盈亏</span>
                      {summary.annualTargetAmount &&
                        parseFloat(summary.annualTargetAmount) > 0 && (
                          <span
                            style={{
                              fontSize: 11,
                              color: "#999",
                              fontWeight: "normal",
                              display: isMobile ? "block" : "inline",
                              whiteSpace: isMobile ? "nowrap" : undefined,
                              lineHeight: isMobile ? "16px" : undefined,
                            }}
                          >
                            目标: ¥
                            {parseFloat(
                              summary.annualTargetAmount,
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                            <span
                              style={{
                                marginLeft: 4,
                                ...(isMobile ? { marginLeft: 0 } : {}),
                                color:
                                  parseFloat(summary.yearProfit) >=
                                  parseFloat(summary.annualTargetAmount)
                                    ? "#cf1322"
                                    : "#faad14",
                              }}
                            >
                              (
                              {(
                                (parseFloat(summary.yearProfit) /
                                  parseFloat(summary.annualTargetAmount)) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          </span>
                        )}
                    </div>
                  }
                  value={Math.abs(parseFloat(summary.yearProfit))}
                  precision={2}
                  prefix={
                    parseFloat(summary.yearProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      <FallOutlined />
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.yearProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: "bold",
                  }}
                />
                <div
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    color:
                      parseFloat(summary.yearProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    marginTop: 8,
                  }}
                >
                  ({parseFloat(summary.yearProfitRate) >= 0 ? "+" : ""}
                  {parseFloat(summary.yearProfitRate).toFixed(2)}%)
                </div>
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={6}>
              <Card style={{ height: "100%" }}>
                <Statistic
                  title={
                    <div style={{ height: isMobile ? 34 : undefined }}>
                      <div>累计盈亏</div>
                      {isMobile && <div style={{ height: 16 }} />}
                    </div>
                  }
                  value={Math.abs(parseFloat(summary.totalProfit))}
                  precision={2}
                  prefix={
                    parseFloat(summary.totalProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      <FallOutlined />
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.totalProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: "bold",
                  }}
                />
                <div
                  style={{
                    fontSize: isMobile ? 14 : 16,
                    color:
                      parseFloat(summary.totalProfit) >= 0
                        ? "#cf1322"
                        : "#3f8600",
                    marginTop: 8,
                  }}
                >
                  ({parseFloat(summary.totalProfitRate) >= 0 ? "+" : ""}
                  {parseFloat(summary.totalProfitRate).toFixed(2)}%)
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* 投资方向列表 */}
        <Card
          title="投资方向列表"
          extra={
            <Link href="/investment-directions">
              <Button type="primary" icon={<PlusOutlined />}>
                管理投资方向
              </Button>
            </Link>
          }
        >
          {directions.length === 0 ? (
            <Empty
              description="暂无投资方向"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link href="/investment-directions">
                <Button type="primary" icon={<PlusOutlined />}>
                  创建第一个投资方向
                </Button>
              </Link>
            </Empty>
          ) : (
            <Row gutter={[16, 16]}>
              {directions.map((direction) => {
                const progress =
                  parseFloat(direction.expectedAmount) > 0
                    ? (parseFloat(direction.actualAmount) /
                        parseFloat(direction.expectedAmount)) *
                      100
                    : 0;

                const stats = summary?.directionStats?.[direction.id];

                return (
                  <Col xs={24} sm={12} lg={8} key={direction.id}>
                    <Link href={`/investment-directions/${direction.id}`}>
                      <Card
                        hoverable
                        style={{ height: "100%" }}
                        styles={{ body: { padding: 20 } }}
                      >
                        <Space
                          orientation="vertical"
                          style={{ width: "100%" }}
                          size="middle"
                        >
                          <div>
                            <h3
                              style={{
                                margin: 0,
                                fontSize: isMobile ? 16 : 18,
                                lineHeight: 1.4,
                                overflowWrap: "anywhere",
                              }}
                            >
                              <FundOutlined style={{ marginRight: 8 }} />
                              {direction.name}
                            </h3>
                          </div>
                          <Row gutter={[8, 12]}>
                            <Col xs={12} sm={6}>
                              <Statistic
                                title={
                                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>持仓收益</span>
                                }
                                value={
                                  stats ? parseFloat(stats.holdingProfit) : 0
                                }
                                precision={2}
                                  valueStyle={{
                                  color:
                                    stats &&
                                    parseFloat(stats.holdingProfit) >= 0
                                      ? "#cf1322"
                                      : "#3f8600",
                                  fontSize: isMobile ? 14 : 15,
                                  fontWeight: 500,
                                  overflowWrap: "anywhere",
                                }}
                              />
                            </Col>
                            <Col xs={12} sm={6}>
                              <Statistic
                                title={
                                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                                    累计收益率
                                  </span>
                                }
                                value={
                                  stats ? parseFloat(stats.totalProfitRate) : 0
                                }
                                precision={2}
                                suffix="%"
                                valueStyle={{
                                  color:
                                    stats &&
                                    parseFloat(stats.totalProfitRate) >= 0
                                      ? "#cf1322"
                                      : "#3f8600",
                                  fontSize: isMobile ? 14 : 15,
                                  fontWeight: 500,
                                  overflowWrap: "anywhere",
                                }}
                              />
                            </Col>
                            <Col xs={12} sm={6}>
                              <Statistic
                                title={
                                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>本月盈亏</span>
                                }
                                value={
                                  stats ? parseFloat(stats.monthProfit) : 0
                                }
                                precision={2}
                                valueStyle={{
                                  color:
                                    stats && parseFloat(stats.monthProfit) >= 0
                                      ? "#cf1322"
                                      : "#3f8600",
                                  fontSize: isMobile ? 14 : 15,
                                  fontWeight: 500,
                                  overflowWrap: "anywhere",
                                }}
                              />
                            </Col>
                            <Col xs={12} sm={6}>
                              <Statistic
                                title={
                                  <span style={{ fontSize: 12, whiteSpace: "nowrap" }}>昨日盈亏</span>
                                }
                                value={
                                  stats && stats.yesterdayProfit
                                    ? parseFloat(stats.yesterdayProfit)
                                    : 0
                                }
                                precision={2}
                                valueStyle={{
                                  color:
                                    stats &&
                                    parseFloat(stats.yesterdayProfit || "0") >=
                                      0
                                      ? "#cf1322"
                                      : "#3f8600",
                                  fontSize: isMobile ? 14 : 15,
                                  fontWeight: 500,
                                  overflowWrap: "anywhere",
                                }}
                              />
                            </Col>
                          </Row>
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 12, color: "#666" }}>
                                投入进度
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color:
                                    progress >= 100 ? "#52c41a" : "#faad14",
                                }}
                              >
                                {progress.toFixed(1)}%
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                backgroundColor: "#f0f0f0",
                                borderRadius: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.min(progress, 100)}%`,
                                  backgroundColor:
                                    progress >= 100 ? "#52c41a" : "#1890ff",
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#999",
                              textAlign: "center",
                            }}
                          >
                            {direction._count?.funds || 0} 只
                            {direction.type === "STOCK" ? "股票" : "基金"}
                          </div>
                        </Space>
                      </Card>
                    </Link>
                  </Col>
                );
              })}
            </Row>
          )}
        </Card>

        {/* 快速开始指南 */}
        <Card title="快速开始" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card type="inner" title="1. 创建投资方向">
                <p>设置您的投资账户，如海外长钱、稳钱账户等</p>
                <Link href="/investment-directions">
                  <Button type="link" icon={<RiseOutlined />}>
                    去创建
                  </Button>
                </Link>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card type="inner" title="2. 添加资产">
                <p>在投资方向下添加具体的基金或股票产品</p>
                <Button type="link" icon={<FundOutlined />} disabled>
                  需先创建投资方向
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card type="inner" title="3. 记录交易">
                <p>记录买入、卖出、分红等交易，系统自动计算收益</p>
                <Button type="link" icon={<LineChartOutlined />} disabled>
                  需先添加资产
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>

        <Modal
          title="AI 投资策略分析"
          open={strategyModalOpen}
          onCancel={() => setStrategyModalOpen(false)}
          footer={null}
          width={850}
        >
          <Button type="primary" icon={<RobotOutlined />} onClick={handleStrategyAnalysis} loading={analyzingStrategy}>
            {analyzingStrategy ? "分析中..." : "生成今日策略分析"}
          </Button>
          <div className="markdown-body" style={{ maxHeight: "65vh", overflowY: "auto", marginTop: 20 }}>
            {strategyReport ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{strategyReport}</ReactMarkdown>
            ) : analyzingStrategy ? (
              <div style={{ textAlign: "center", padding: 32 }}><Spin tip="正在分析全部持仓和预警..." /></div>
            ) : strategyHistory.length > 0 ? (
              <List
                header="历史策略报告"
                dataSource={strategyHistory}
                renderItem={(item) => (
                  <List.Item>
                    <Button type="link" onClick={() => setStrategyReport(item.content)}>
                      {dayjs(item.createdAt).format("YYYY-MM-DD HH:mm:ss")}
                    </Button>
                  </List.Item>
                )}
              />
            ) : <div style={{ color: "#999", marginTop: 20 }}>暂无策略分析报告</div>}
          </div>
        </Modal>
      </div>

      {/* 更新结果 Modal */}
      <Modal
        title="批量更新结果"
        open={showResultModal}
        onCancel={() => setShowResultModal(false)}
        footer={[
          <Button
            key="close"
            type="primary"
            onClick={() => setShowResultModal(false)}
          >
            关闭
          </Button>,
        ]}
        width={isMobile ? "90%" : 600}
      >
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          {updateResults.map((result, index) => (
            <div
              key={index}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: isMobile ? 12 : 14 }}>
                  {result.fundName} ({result.code})
                </span>
                <span
                  style={{
                    color: result.success ? "#52c41a" : "#ff4d4f",
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  {result.success ? "✓ 成功" : "✗ 失败"}
                </span>
              </div>
              {result.success && result.netWorth && (
                <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                  净值: ¥{result.netWorth} ({result.netWorthDate})
                </div>
              )}
              {!result.success && result.error && (
                <div style={{ fontSize: 12, color: "#ff4d4f", marginTop: 4 }}>
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </App>
  );
}
