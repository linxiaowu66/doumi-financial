"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, App, Button, Card, Col, Empty, Form, Input, InputNumber, List, Row, Space, Spin, Table, Tag, Typography } from "antd";
import { ReloadOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const allocationFields = [
  ["EQUITY", "股票 / 权益"],
  ["FIXED_INCOME", "债券 / 固收"],
  ["GOLD", "黄金"],
  ["CASH_FLOW", "现金流"],
  ["OTHER", "其他"],
] as const;

type Policy = { annualReturnTarget: number; emergencyCashAmount: number; rebalanceBandPercent: number; targetAllocation: Record<string, number> };
type Holding = { id?: number; fundCode?: string | null; fundName: string; assetClass?: string | null; marketValue: number | null; weight?: number | null; confidence?: number | null; note?: string | null; asOfDate?: string };
type Account = { id: number; name: string; managerName: string | null; strategyName: string | null; platform: string; sourceType: string; qiemanUserPropertyId: string | null; qiemanUserPropertyIds: string | null; qiemanTokenConfigured: boolean; asOfDate: string | null; householdAsset: { balance: string; asOfDate: string } | null; holdings: Holding[]; imports: Array<{ id: number; asOfDate: string; sourceFileNames: string | null; createdAt: string }> };
type HouseholdAllocation = { category: string; value: number };
type PolicyForm = Policy & { targetAllocation: Record<string, number> };
type SyncRun = { id: number; kind: string; scope: string | null; status: string; asOfDate: string | null; itemCount: number; errorMessage: string | null; startedAt: string; completedAt: string | null };
type RebalanceRow = { category: string; currentValue: number; currentPercent: number; targetPercent: number; targetValue: number; gapAmount: number; recommendedAction: string; recommendedAmount: number; status: string };
type RebalanceData = { total: number; band: number; emergencyCashAmount: number; cashReserveGap: number; rows: RebalanceRow[]; note: string };
type PortfolioBacktestData = { result: { enoughData: boolean; observations: number; funds: number; dataGrade?: string; strategy?: { totalReturn: number; annualizedReturn: number; annualizedVolatility: number; sharpe: number | null; maxDrawdown: number; trades: number; turnover: number }; firstDate?: string; lastDate?: string; rebalanceFrequency?: string; robustness?: { recommendedMinimumObservations: number; note: string; feeStress: Array<{ multiplier: number; enoughData: boolean; strategy?: { annualizedReturn: number; maxDrawdown: number } | null }>; rebalanceSensitivity: Array<{ frequency: string; enoughData: boolean; strategy?: { annualizedReturn: number; maxDrawdown: number } | null }>; walkForward: Array<{ name: string; enoughData: boolean; observations: number; dataGrade: string; strategy?: { annualizedReturn: number; maxDrawdown: number } | null }> } }; method: string; excludedFunds?: Array<{ id: number; name: string; directionName: string; assetClass: string; observations: number; reason: string }> };
type VirtualAccount = { id: number; name: string; initialCash: number; cash: number; asOfDate: string | null; positions: Array<{ fundId: number; shares: number }>; trades: Array<{ id: number; fundId: number; signalDate: string; action: string; amount: number; price: number; shares: number; fee: number; reason: string | null; fund: { name: string; code: string }; direction: { name: string } }> };

export default function StrategyCenterPage() {
  const { message } = App.useApp();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<number | null>(null);
  const [accountIdDrafts, setAccountIdDrafts] = useState<Record<string, string>>({});
  const [tokenDrafts, setTokenDrafts] = useState<Record<string, string>>({});
  const [householdAllocation, setHouseholdAllocation] = useState<HouseholdAllocation[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [rebalanceData, setRebalanceData] = useState<RebalanceData | null>(null);
  const [backtestData, setBacktestData] = useState<PortfolioBacktestData | null>(null);
  const [backtesting, setBacktesting] = useState(false);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [virtualInitialCash, setVirtualInitialCash] = useState<number>(0);
  const [initializingVirtualAccount, setInitializingVirtualAccount] = useState(false);
  const [policyForm] = Form.useForm<PolicyForm>();
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || accounts[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policyResponse, accountsResponse, householdResponse, syncResponse, rebalanceResponse, virtualResponse] = await Promise.all([fetch("/api/household-policy"), fetch("/api/strategy-accounts"), fetch("/api/household-assets"), fetch("/api/data-sync/status"), fetch("/api/household-policy/rebalance"), fetch("/api/fund-signals/virtual-account")]);
      const policyData = await policyResponse.json();
      const accountData = await accountsResponse.json();
      const householdData = await householdResponse.json();
      const syncData = await syncResponse.json();
      const rebalance = await rebalanceResponse.json();
      const virtualData = await virtualResponse.json();
      if (!policyResponse.ok) throw new Error(policyData.error || "加载家庭资产政策失败");
      if (!accountsResponse.ok) throw new Error(accountData.error || "加载策略账户失败");
      if (!householdResponse.ok) throw new Error(householdData.error || "加载家庭资产总账失败");
      if (!syncResponse.ok) throw new Error(syncData.error || "加载同步状态失败");
      if (!rebalanceResponse.ok) throw new Error(rebalance.error || "加载再平衡建议失败");
      if (!virtualResponse.ok) throw new Error(virtualData.error || "加载虚拟信号账户失败");
      setAccounts(accountData);
      setHouseholdAllocation(householdData.allocationCurrent ?? []);
      setSyncRuns(syncData.runs ?? []);
      setRebalanceData(rebalance);
      setVirtualAccount(virtualData.account ?? null);
      setVirtualInitialCash((current) => current || Number(virtualData.account?.initialCash || 0));
      setAccountIdDrafts((current) => Object.fromEntries(accountData.map((account: Account) => {
        let ids = account.qiemanUserPropertyId || "";
        try {
          const parsed = account.qiemanUserPropertyIds ? JSON.parse(account.qiemanUserPropertyIds) : [];
          if (Array.isArray(parsed)) ids = parsed.join(", ");
        } catch {
          // Keep the legacy single-id value.
        }
        return [account.id, current[account.id] ?? ids];
      })));
      setTokenDrafts((current) => Object.fromEntries(accountData.map((account: Account) => [account.id, current[account.id] ?? ""])))
      setSelectedAccountId((current) => current ?? accountData[0]?.id ?? null);
      policyForm.setFieldsValue({ ...policyData, targetAllocation: policyData.targetAllocation });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载策略中枢失败");
    } finally {
      setLoading(false);
    }
  }, [message, policyForm]);

  useEffect(() => { void load(); }, [load]);

  const targetAllocation = Form.useWatch("targetAllocation", policyForm);
  const rebalanceBandPercent = Form.useWatch("rebalanceBandPercent", policyForm);
  const allocationTotal = useMemo(() => allocationFields.reduce((sum, [key]) => sum + Number(targetAllocation?.[key] || 0), 0), [targetAllocation]);
  const householdAllocationTotal = useMemo(() => householdAllocation.reduce((sum, item) => sum + Number(item.value || 0), 0), [householdAllocation]);
  const householdAllocationRows = useMemo(() => allocationFields.map(([key, label]) => {
    const value = Number(householdAllocation.find((item) => item.category === key)?.value || 0);
    const targetPercent = Number(targetAllocation?.[key] || 0);
    const actualPercent = householdAllocationTotal > 0 ? value / householdAllocationTotal * 100 : 0;
    const gapAmount = householdAllocationTotal * targetPercent / 100 - value;
    const withinBand = Math.abs(actualPercent - targetPercent) <= Number(rebalanceBandPercent || 0);
    return {
      key,
      label,
      value,
      actualPercent,
      targetPercent,
      gapAmount,
      status: withinBand ? "在允许范围" : gapAmount > 0 ? "低配，可增加" : "高配，可减少",
      statusColor: withinBand ? "green" : gapAmount > 0 ? "orange" : "red",
    };
  }), [householdAllocation, householdAllocationTotal, rebalanceBandPercent, targetAllocation]);
  const formatMoney = (value: number) => `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const savePolicy = async (values: PolicyForm) => {
    setSaving(true);
    try {
      const response = await fetch("/api/household-policy", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存失败");
      message.success("家庭资产政策已保存");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存家庭资产政策失败");
    } finally {
      setSaving(false);
    }
  };

  const saveQiemanConfig = async (accountId: number) => {
    const qiemanUserPropertyIds = (accountIdDrafts[accountId] || "").trim();
    const qiemanBearerToken = (tokenDrafts[accountId] || "").trim();
    if (qiemanUserPropertyIds && /[^\d\s,，、;；/?:#._-]/.test(qiemanUserPropertyIds)) return message.warning("请输入有效的且慢 userPropertyId 或资产页 URL");
    if (qiemanBearerToken.length > 4096) return message.warning("且慢 Token 长度异常");
    try {
      const response = await fetch("/api/strategy-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, qiemanUserPropertyIds, ...(qiemanBearerToken ? { qiemanBearerToken } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "保存且慢账户配置失败");
      setTokenDrafts((current) => ({ ...current, [accountId]: "" }));
      message.success("且慢账户配置已保存");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存且慢账户配置失败");
    }
  };

  const clearQiemanToken = async (accountId: number) => {
    try {
      const response = await fetch("/api/strategy-accounts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId, qiemanBearerTokenClear: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "清除且慢 Token 失败");
      setTokenDrafts((current) => ({ ...current, [accountId]: "" }));
      message.success("且慢 Token 已清除");
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "清除且慢 Token 失败");
    }
  };

  const syncQieman = async (accountId: number) => {
    setSyncingAccountId(accountId);
    try {
      const response = await fetch("/api/strategy-accounts/sync-qieman", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accountId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "同步且慢资产失败");
      message.success(`已同步 ${data.count} 条且慢持仓（${data.asOfDate}）`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "同步且慢资产失败");
    } finally {
      setSyncingAccountId(null);
    }
  };

  const runPortfolioBacktest = async () => {
    setBacktesting(true);
    try {
      const response = await fetch("/api/fund-signals/portfolio-backtest");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "组合回测失败");
      setBacktestData(data);
      message.success(data.result?.enoughData ? "组合回测完成" : "历史数据不足，已返回数据检查结果");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "组合回测失败");
    } finally {
      setBacktesting(false);
    }
  };

  const initializeVirtualAccount = async () => {
    if (!Number.isFinite(virtualInitialCash) || virtualInitialCash < 0) return message.warning("请输入非负的初始现金");
    setInitializingVirtualAccount(true);
    try {
      const response = await fetch("/api/fund-signals/virtual-account", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initialize: true, initialCash: virtualInitialCash, seedFromCurrentHoldings: true }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "初始化虚拟信号账户失败");
      setVirtualAccount(data.account);
      message.success("虚拟信号账户已初始化，并已按当前基金份额建立起始仓位");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "初始化虚拟信号账户失败");
    } finally {
      setInitializingVirtualAccount(false);
    }
  };

  if (loading) return <div style={{ padding: 32, textAlign: "center" }}><Spin /></div>;

  return (
    <div style={{ minHeight: "100vh", padding: "24px", background: "#f5f5f5" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Card style={{ marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>策略中枢</Title>
          <Text type="secondary">先确定家庭资产边界，再同步外部策略组合，最后用回测验证规则。</Text>
        </Card>

        <Card title="家庭资产政策" extra={<Tag color="blue">只约束，不自动下单</Tag>} style={{ marginBottom: 16 }}>
          <Form form={policyForm} layout="vertical" onFinish={savePolicy}>
            <Row gutter={[16, 8]}>
              <Col xs={24} sm={8}><Form.Item name="annualReturnTarget" label="长期目标年化（%）"><InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} sm={8}><Form.Item name="emergencyCashAmount" label="现金安全垫（元）"><InputNumber min={0} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
              <Col xs={24} sm={8}><Form.Item name="rebalanceBandPercent" label="再平衡允许偏离（百分点）"><InputNumber min={0} max={50} precision={2} style={{ width: "100%" }} /></Form.Item></Col>
            </Row>
            <Text strong>家庭目标配置</Text>
            <Row gutter={[16, 8]} style={{ marginTop: 8 }}>
              {allocationFields.map(([key, label]) => <Col xs={24} sm={12} md={8} key={key}><Form.Item name={["targetAllocation", key]} label={label}><InputNumber min={0} max={100} precision={2} suffix="%" style={{ width: "100%" }} /></Form.Item></Col>)}
            </Row>
            <Space wrap><Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>保存资产政策</Button><Text type={allocationTotal === 100 ? "success" : "danger"}>当前目标合计：{allocationTotal.toFixed(2)}%</Text></Space>
          </Form>
          <Text type="secondary" style={{ display: "block", marginTop: 12 }}>配置缺口以后按当前市值计算；成本价只用于收益和盈亏，不再用成本价代表当前家庭仓位。</Text>
        </Card>

        <Card title="家庭资产政策执行情况" extra={<Tag color="blue">决策参考</Tag>} style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <Text type="secondary">当前可识别家庭资产：{formatMoney(householdAllocationTotal)}。金额缺口按当前总市值 × 目标比例计算。</Text>
            {householdAllocationTotal > 0 ? <Table
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ x: 720 }}
              dataSource={householdAllocationRows}
              columns={[
                { title: "资产类别", dataIndex: "label" },
                { title: "当前市值", dataIndex: "value", render: (value: number) => formatMoney(value) },
                { title: "当前比例", dataIndex: "actualPercent", render: (value: number) => `${value.toFixed(1)}%` },
                { title: "目标比例", dataIndex: "targetPercent", render: (value: number) => `${value.toFixed(1)}%` },
                { title: "理论缺口", dataIndex: "gapAmount", render: (value: number) => `${value >= 0 ? "需增加" : "可减少"} ${formatMoney(Math.abs(value))}` },
                { title: "状态", dataIndex: "status", render: (value: string, row: (typeof householdAllocationRows)[number]) => <Tag color={row.statusColor}>{value}</Tag> },
              ]}
            /> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可识别的家庭资产数据" />}
            <Text type="secondary">口径：已包含家庭资产总账和且慢账户的最新底层持仓；盈米宝计入现金流，且慢账户不会与底层持仓重复计算。正数缺口表示相对目标低配，负数表示高配。状态会使用上方设置的再平衡允许偏离百分点。</Text>
          </Space>
        </Card>

        <Card title="数据同步状态" extra={<Tag color="cyan">失败可重试</Tag>} style={{ marginBottom: 16 }}>
          <Row gutter={[16, 12]}>
            {["NET_WORTH", "QIEMAN", "METADATA"].map((kind) => {
              const run = syncRuns.find((item) => item.kind === kind);
              const label = kind === "NET_WORTH" ? "基金净值" : kind === "QIEMAN" ? "且慢资产" : "基金资料";
              return <Col xs={24} sm={8} key={kind}><Card size="small"><Space direction="vertical" size={4}><Text strong>{label}</Text><Tag color={run?.status === "SUCCESS" ? "green" : run?.status === "FAILED" ? "red" : "default"}>{run?.status === "SUCCESS" ? "最近成功" : run?.status === "FAILED" ? "最近失败" : "暂无记录"}</Tag><Text type="secondary">{run ? `${dayjs(run.completedAt || run.startedAt).format("YYYY-MM-DD HH:mm")} · ${run.itemCount} 条` : "尚未同步"}</Text>{run?.errorMessage && <Text type="danger">{run.errorMessage}</Text>}</Space></Card></Col>;
            })}
          </Row>
          <Text type="secondary" style={{ display: "block", marginTop: 12 }}>基金净值由每日任务或首页手动更新产生；且慢账户目前使用账户卡片中的同步按钮，失败后可直接重试。同步状态只说明数据是否写入，不代表资产收益。</Text>
        </Card>

        <Card title="家庭再平衡建议" extra={<Tag color="orange">只提供金额参考</Tag>} style={{ marginBottom: 16 }}>
          {rebalanceData ? <Space direction="vertical" size={10} style={{ width: "100%" }}>
            <Text type="secondary">当前可识别资产 ¥{rebalanceData.total.toLocaleString()}，允许偏离 {rebalanceData.band} 个百分点。安全垫不足：¥{rebalanceData.cashReserveGap.toLocaleString()}。</Text>
            <Table rowKey="category" size="small" pagination={false} scroll={{ x: 820 }} dataSource={rebalanceData.rows} columns={[{ title: "资产类别", dataIndex: "category", render: (value: string) => allocationFields.find(([key]) => key === value)?.[1] || value }, { title: "当前比例", dataIndex: "currentPercent", render: (value: number) => `${value.toFixed(1)}%` }, { title: "目标比例", dataIndex: "targetPercent", render: (value: number) => `${value.toFixed(1)}%` }, { title: "缺口金额", dataIndex: "gapAmount", render: (value: number) => `${value >= 0 ? "需增加" : "可减少"} ¥${Math.abs(value).toLocaleString()}` }, { title: "建议", dataIndex: "recommendedAction", render: (value: string, row: RebalanceRow) => <Tag color={value === "BUY" ? "green" : value === "SELL" ? "red" : "default"}>{value === "BUY" ? `增加 ¥${row.recommendedAmount.toLocaleString()}` : value === "SELL" ? `减少 ¥${row.recommendedAmount.toLocaleString()}` : "保持"}</Tag> }]} />
            <Text type="secondary">{rebalanceData.note}</Text>
          </Space> : <Empty description="暂无再平衡数据" />}
        </Card>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={10}>
            <Card title="且慢策略账户" extra={<Tag color="purple">官方接口同步</Tag>}>
              {accounts.length === 0 ? <Empty description="还没有绑定策略账户" /> : <List dataSource={accounts} renderItem={(account) => <List.Item actions={[...(account.qiemanTokenConfigured && (account.qiemanUserPropertyIds || account.qiemanUserPropertyId) ? [<Button key="sync" loading={syncingAccountId === account.id} onClick={() => syncQieman(account.id)}>同步且慢</Button>] : []), <Button key="select" type={selectedAccount?.id === account.id ? "primary" : "link"} onClick={() => setSelectedAccountId(account.id)}>查看</Button>]}>
                <List.Item.Meta title={account.name} description={<Space direction="vertical" size={8} style={{ width: "100%" }}><span>{account.managerName ? `${account.managerName} · ` : ""}{account.strategyName || "未填写策略"}</span><span>账户余额：¥{Number(account.householdAsset?.balance || 0).toLocaleString()}</span><Input value={accountIdDrafts[account.id] || ""} placeholder="多个且慢 userPropertyId 或资产页 URL，用逗号分隔" onChange={(event) => setAccountIdDrafts((current) => ({ ...current, [account.id]: event.target.value }))} /><Input.Password value={tokenDrafts[account.id] || ""} placeholder={account.qiemanTokenConfigured ? "已配置 Token，输入新 Token 可替换" : "该账户的且慢 Token"} onChange={(event) => setTokenDrafts((current) => ({ ...current, [account.id]: event.target.value }))} /><Space wrap><Button type="primary" onClick={() => saveQiemanConfig(account.id)}>保存账户配置</Button><Button danger disabled={!account.qiemanTokenConfigured} onClick={() => clearQiemanToken(account.id)}>清除 Token</Button><Tag color={account.qiemanTokenConfigured ? "green" : "default"}>{account.qiemanTokenConfigured ? "Token 已配置" : "Token 未配置"}</Tag></Space></Space>} />
              </List.Item>} />}
              <Text type="secondary" style={{ display: "block", marginTop: 12 }}>每个策略账户分别绑定自己的且慢 Token 和一个或多个资产标识；多个标识会先分别读取，再合并为该账户的持仓快照。接口同步不会覆盖合并家庭资产余额。</Text>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title={selectedAccount ? `${selectedAccount.name} · 官方持仓快照` : "官方持仓快照"}>
              {selectedAccount && <Space direction="vertical" style={{ width: "100%" }} size="middle">
                {selectedAccount.holdings.length > 0 ? <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} scroll={{ x: 620 }} dataSource={selectedAccount.holdings} columns={[{ title: "基金", dataIndex: "fundName" }, { title: "大类", dataIndex: "assetClass" }, { title: "市值", dataIndex: "marketValue", render: (value: number) => `¥${Number(value).toLocaleString()}` }, { title: "日期", dataIndex: "asOfDate", render: (value: string) => dayjs(value).format("YYYY-MM-DD") }]} /> : <Empty description="还没有同步且慢持仓" />}
              </Space>}
            </Card>
          </Col>
        </Row>

        <Card title="虚拟信号账户" style={{ marginTop: 16 }} extra={<Tag color="purple">只模拟，不下单</Tag>}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} sm={8}><Text type="secondary">初始现金（用于模拟后续买入）</Text><InputNumber min={0} precision={2} value={virtualInitialCash} onChange={(value) => setVirtualInitialCash(Number(value || 0))} addonAfter="元" style={{ width: "100%" }} /></Col>
            <Col xs={24} sm={8}><Button type="primary" loading={initializingVirtualAccount} onClick={() => void initializeVirtualAccount()}>初始化起始账户</Button></Col>
            <Col xs={24} sm={8}>{virtualAccount ? <Space direction="vertical" size={2}><Text>现金余额：¥{virtualAccount.cash.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}</Text><Text type="secondary">起始仓位 {virtualAccount.positions.length} 只 · 最近更新 {virtualAccount.asOfDate || "暂无交易"}</Text></Space> : <Text type="secondary">尚未初始化；首页的买卖信号可记入此账户。</Text>}</Col>
          </Row>
          {virtualAccount && virtualAccount.trades.length > 0 && <Table rowKey="id" size="small" pagination={{ pageSize: 5 }} scroll={{ x: 720 }} style={{ marginTop: 12 }} dataSource={virtualAccount.trades} columns={[{ title: "日期", dataIndex: "signalDate" }, { title: "基金", render: (_: unknown, row: VirtualAccount["trades"][number]) => row.fund.name }, { title: "动作", dataIndex: "action", render: (value: string) => <Tag color={value === "BUY" ? "green" : "red"}>{value === "BUY" ? "买入" : "卖出"}</Tag> }, { title: "金额", dataIndex: "amount", render: (value: number) => `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2 })}` }, { title: "原因", dataIndex: "reason", render: (value: string | null) => value || "—" }]} />}
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>它把首页明确的买入 / 卖出信号按假设成交价记账，用来检查规则是否持续有效；不会改动真实交易记录。初始仓位来自当前已登记基金份额，盈米宝等现金流资产不参与。</Text>
        </Card>

        <Card title="组合级回测验证" style={{ marginTop: 16 }} extra={<Button icon={<ReloadOutlined />} loading={backtesting} onClick={() => void runPortfolioBacktest()}>运行回测</Button>}>
          <Text>按家庭目标大类把目标权重平均分配到有足够历史数据的基金，每月再平衡；使用 T-1 决策、下一净值点执行并扣除买卖费，不包含且慢缺少历史成分快照的持仓。</Text>
          {backtestData?.result && <div style={{ marginTop: 12 }}>{backtestData.result.enoughData && backtestData.result.strategy ? <><Space wrap><Tag color={backtestData.result.dataGrade === "ROBUST" ? "green" : "blue"}>数据等级：{backtestData.result.dataGrade}</Tag><Text type="secondary">样本 {backtestData.result.observations} 个观察日 · {backtestData.result.firstDate} 至 {backtestData.result.lastDate}</Text></Space><Row gutter={[12, 12]} style={{ marginTop: 10 }}><Col xs={12} sm={6}><Text type="secondary">总收益</Text><div>{backtestData.result.strategy.totalReturn}%</div></Col><Col xs={12} sm={6}><Text type="secondary">年化收益</Text><div>{backtestData.result.strategy.annualizedReturn}%</div></Col><Col xs={12} sm={6}><Text type="secondary">最大回撤</Text><div>{backtestData.result.strategy.maxDrawdown}%</div></Col><Col xs={12} sm={6}><Text type="secondary">夏普 / 交易</Text><div>{backtestData.result.strategy.sharpe ?? "不足"} / {backtestData.result.strategy.trades}</div></Col></Row>{backtestData.result.robustness && <Text type="secondary" style={{ display: "block", marginTop: 10 }}>费率压力：{backtestData.result.robustness.feeStress.map((item) => `${item.multiplier}× ${item.strategy ? `年化 ${item.strategy.annualizedReturn}% / 回撤 ${item.strategy.maxDrawdown}%` : "数据不足"}`).join("；")}。再平衡敏感性：{backtestData.result.robustness.rebalanceSensitivity.map((item) => `${item.frequency === "MONTHLY" ? "月度" : "季度"} ${item.strategy ? `年化 ${item.strategy.annualizedReturn}%` : "数据不足"}`).join("；")}。</Text>}</> : <Alert type="warning" showIcon message="历史数据不足，无法完成组合回测" description={`当前可用 ${backtestData.result.funds} 只基金、${backtestData.result.observations} 个观察日；最低需要 126 个观察日，建议至少 756 个观察日（约 3 年）。${backtestData.excludedFunds?.length ? `另有 ${backtestData.excludedFunds.length} 只基金因历史不足或分类未纳入而排除。` : ""}`} />}</div>}
          <Text type="secondary" style={{ display: "block", marginTop: 12 }}>回测结果用于比较规则，不是未来收益承诺；实际执行仍需考虑申购限制、确认天数和现金流。</Text>
        </Card>
      </div>
    </div>
  );
}
