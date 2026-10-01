"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tabs,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  HouseholdHistoryPoint,
  cumulativeInsurancePremium,
  hasAnnualPolicyGap,
  insurancePremiumsByYear,
  isAnnualPolicyRenewalDue,
  formatWanAxis,
  isHouseholdAssetUpdateDue,
  monthAxisAnchor,
  nextAnnualPolicyPeriod,
  previousAnnualPolicyPeriod,
  shiftHouseholdMonth,
  suggestSnapshotMonth,
} from "@/lib/household-assets";

const { Title, Text } = Typography;

const platformOptions = [
  { value: "QIEMAN", label: "且慢基金", color: "blue" },
  { value: "YUEBAO", label: "余额宝 / 现金流", color: "green" },
  { value: "HUATAI", label: "华泰证券", color: "purple" },
  { value: "PERSONAL_PENSION", label: "个人养老金", color: "orange" },
  { value: "OTHER", label: "其他", color: "default" },
];

const policyTypeOptions = [
  { value: "ACCIDENT", label: "意外险" },
  { value: "CRITICAL_ILLNESS", label: "重疾险" },
  { value: "LIFE", label: "寿险" },
  { value: "MEDICAL", label: "医疗险" },
  { value: "NURSING", label: "护理险" },
  { value: "OTHER", label: "其他" },
];

interface Member {
  id: number;
  name: string;
  relation: string | null;
}

interface Asset {
  id: number;
  memberId: number | null;
  member: Member | null;
  name: string;
  platform: string;
  balance: string;
  asOfDate: string;
  remark: string | null;
  histories: Array<{ id: number; balance: string; asOfDate: string; month: string }>;
}

interface DirectionSnapshot {
  id: number;
  month: string;
  value: string;
}

interface Direction {
  id: number;
  name: string;
  householdMember: Member | null;
  currentValue: number;
  latestNetWorthDate: string | null;
  snapshotValue: string | null;
  snapshotMonth: string | null;
  snapshots: DirectionSnapshot[];
}

interface Payment {
  id: number;
  year: number;
  amount: string;
  paidAt: string;
}

interface Policy {
  id: number;
  planId: number;
  insuredMemberId: number | null;
  insuredMember: Member | null;
  name: string;
  provider: string | null;
  policyNumber: string | null;
  type: string;
  coverageAmount: string;
  annualPremium: string;
  startDate: string | null;
  maturityDate: string | null;
  refundableAmount: string;
  active: boolean;
  remark: string | null;
  premiumPayments: Payment[];
}

interface InsurancePlan {
  id: number;
  insuredMemberId: number | null;
  insuredMember: Member | null;
  type: string;
  mode: "ANNUAL" | "LONG_TERM";
  policies: Policy[];
}

interface AssetFormValues {
  name: string;
  platform: string;
  memberId?: number;
  balance?: number;
  month?: Dayjs;
  remark?: string;
}

interface MonthFormValues {
  month: Dayjs;
  balance: number;
}

interface PolicyFormValues {
  name: string;
  provider?: string;
  type: string;
  insuredMemberId?: number;
  coverageMode: "ANNUAL" | "LONG_TERM";
  policyNumber?: string;
  coverageAmount: number;
  annualPremium: number;
  startDate?: Dayjs;
  maturityDate?: Dayjs;
  refundableAmount: number;
  active: boolean;
  remark?: string;
}

const money = (value: number | string) =>
  `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MonthAxisTick({
  x = 0,
  y = 0,
  payload,
  index = 0,
  visibleTicksCount = 0,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  index?: number;
  visibleTicksCount?: number;
}) {
  return (
    <text x={x} y={y} dy={14} textAnchor={monthAxisAnchor(index, visibleTicksCount)} fill="rgba(0,0,0,0.65)" fontSize={12}>
      {payload?.value}
    </text>
  );
}

export default function HouseholdAssetsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [history, setHistory] = useState<HouseholdHistoryPoint[]>([]);
  const [maintenanceDates, setMaintenanceDates] = useState<Array<string | Date>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [memberOpen, setMemberOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [policyPlan, setPolicyPlan] = useState<InsurancePlan | null>(null);
  const [policyCopyMode, setPolicyCopyMode] = useState<"renew" | "replace" | "backfill" | "copy" | null>(null);
  const [historyPlanId, setHistoryPlanId] = useState<number | null>(null);
  const [directCopyPlan, setDirectCopyPlan] = useState<InsurancePlan | null>(null);
  const [copyTargetMemberId, setCopyTargetMemberId] = useState<number>();
  const [paymentPolicy, setPaymentPolicy] = useState<Policy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncMonth, setSyncMonth] = useState<Dayjs | null>(null);
  const [syncDirections, setSyncDirections] = useState<Direction[]>([]);
  const [syncNetWorthDate, setSyncNetWorthDate] = useState<string | null>(null);
  const [monthDraft, setMonthDraft] = useState<{ historyId: number | null } | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<number | null>(null);
  const [snapshotEdit, setSnapshotEdit] = useState<{ id: number; directionName: string } | null>(null);
  const [snapshotMonth, setSnapshotMonth] = useState<Dayjs | null>(null);
  const [historyDirectionId, setHistoryDirectionId] = useState<number | null>(null);
  const [memberForm] = Form.useForm();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const [monthForm] = Form.useForm<MonthFormValues>();
  const [policyForm] = Form.useForm<PolicyFormValues>();
  const [paymentForm] = Form.useForm();
  const policyCoverageMode = Form.useWatch("coverageMode", policyForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/household-assets${selectedMemberId === null ? "" : `?memberId=${selectedMemberId}`}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMembers(data.members);
      setAssets(data.assets);
      setEditingAsset((current) => current ? (data.assets as Asset[]).find((asset) => asset.id === current.id) || null : null);
      setInsurancePlans(data.insurancePlans);
      setDirections(data.directions);
      setHistory(data.history);
      setMaintenanceDates(data.maintenanceDates);
      window.dispatchEvent(new Event("household-assets-updated"));
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载家庭资产失败");
    } finally {
      setLoading(false);
    }
  }, [message, selectedMemberId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const historyAsset = assets.find((asset) => asset.id === historyAssetId);
    if (monthDraft?.historyId == null || !historyAsset) return;
    if (historyAsset.histories.some((history) => history.id === monthDraft.historyId)) return;
    setMonthDraft(null);
  }, [assets, historyAssetId, monthDraft]);

  const totals = useMemo(() => {
    const sum = (platforms?: string[]) => assets.reduce(
      (total, asset) => !platforms || platforms.includes(asset.platform)
        ? total + Number(asset.balance)
        : total,
      0,
    );
    return {
      all: sum() + directions.reduce((total, direction) => total + Number(direction.snapshotValue || 0), 0),
      investments: sum(["QIEMAN", "HUATAI"]) + directions.reduce((total, direction) => total + Number(direction.snapshotValue || 0), 0),
      cash: sum(["YUEBAO"]),
      pension: sum(["PERSONAL_PENSION"]),
      refundable: insurancePlans.reduce((total, plan) => total + Number(plan.policies[0]?.refundableAmount || 0), 0),
    };
  }, [assets, directions, insurancePlans]);

  const updateDue = isHouseholdAssetUpdateDue(maintenanceDates);
  const currentYear = dayjs().year();
  const unpaidPolicies = insurancePlans.flatMap((plan) => plan.mode === "LONG_TERM" ? plan.policies : []).filter(
    (policy) => policy.active
      && Number(policy.annualPremium) > 0
      && !policy.premiumPayments.some((payment) => payment.year === currentYear),
  );
  const renewalDuePlans = insurancePlans.filter((plan) => plan.mode === "ANNUAL" && isAnnualPolicyRenewalDue(plan.policies[0]?.maturityDate || null));
  const gapPlans = insurancePlans.filter((plan) => plan.mode === "ANNUAL" && hasAnnualPolicyGap(plan.policies, plan.type === "ACCIDENT" ? 7 : 0, new Date()));
  const insuranceGroups = useMemo(() => {
    const groups = new Map<string, { name: string; plans: InsurancePlan[] }>();
    for (const plan of insurancePlans) {
      const key = String(plan.insuredMemberId ?? "unassigned");
      const group = groups.get(key) || { name: plan.insuredMember?.name || "未指定成员", plans: [] };
      group.plans.push(plan);
      groups.set(key, group);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, ...group }));
  }, [insurancePlans]);
  const premiumDashboard = useMemo(() => {
    const yearly = new Map<number, number>();
    const memberTotals = insuranceGroups.map((group) => {
      let total = 0;
      let current = 0;
      for (const plan of group.plans) {
        for (const item of insurancePremiumsByYear(plan.mode, plan.policies)) {
          total += item.amount;
          if (item.year === currentYear) current += item.amount;
          yearly.set(item.year, (yearly.get(item.year) || 0) + item.amount);
        }
      }
      return { ...group, total, current };
    });
    const byYear = [...yearly].map(([year, total]) => ({ year: String(year), total })).sort((a, b) => a.year.localeCompare(b.year));
    return {
      byYear,
      memberTotals,
      total: byYear.reduce((sum, item) => sum + item.total, 0),
      current: yearly.get(currentYear) || 0,
    };
  }, [currentYear, insuranceGroups]);

  const save = async (method: "POST" | "PUT", body: Record<string, unknown>, successMessage = "保存成功") => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/household-assets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      void loadData();
      message.success(successMessage);
      return true;
    } catch (error) {
      message.error(error instanceof Error ? error.message : "保存失败");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (resource: string, id: number) => {
    try {
      const response = await fetch(`/api/household-assets?resource=${resource}&id=${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (resource === "asset") {
        setAssetOpen(false);
        setHistoryAssetId(null);
        setMonthDraft(null);
      }
      if (resource === "member" && selectedMemberId === id) {
        setSelectedMemberId(null);
        message.success("删除成功");
        return;
      }
      await loadData();
      message.success("删除成功");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const openSync = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/household-assets");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setSyncDirections(data.directions);
      setSyncNetWorthDate(data.latestNetWorthDate ?? null);
      setSyncMonth(data.suggestedSnapshotMonth ? dayjs(`${data.suggestedSnapshotMonth}-01`) : dayjs());
      setSyncOpen(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "加载投资方向失败");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmSync = async () => {
    if (!syncMonth) return;
    const month = syncMonth.format("YYYY-MM");
    if (await save("POST", { resource: "syncDirections", month }, `已写入 ${month} 投资方向快照`)) setSyncOpen(false);
  };

  const copyAnnualPlan = async () => {
    if (!directCopyPlan || !copyTargetMemberId) return;
    if (await save("POST", {
      resource: "copyPlan",
      planId: directCopyPlan.id,
      insuredMemberId: copyTargetMemberId,
    }, "保障已复制")) {
      setDirectCopyPlan(null);
      setCopyTargetMemberId(undefined);
    }
  };

  const openMember = (member?: Member) => {
    setEditingMember(member || null);
    memberForm.setFieldsValue(member ? { name: member.name, relation: member.relation } : { name: "", relation: "" });
    setMemberOpen(true);
  };

  const openAsset = (asset?: Asset) => {
    setEditingAsset(asset || null);
    assetForm.resetFields();
    assetForm.setFieldsValue(asset ? {
      name: asset.name,
      platform: asset.platform,
      memberId: asset.memberId || undefined,
      remark: asset.remark || undefined,
    } : {
      name: "",
      platform: "QIEMAN",
      balance: 0,
      month: dayjs(`${suggestSnapshotMonth([])}-01`),
    });
    setAssetOpen(true);
  };

  const openAssetHistory = (asset: Asset) => {
    setMonthDraft(null);
    monthForm.resetFields();
    setHistoryAssetId(asset.id);
  };

  const closeAssetHistory = () => {
    setHistoryAssetId(null);
    setMonthDraft(null);
  };

  const editAssetMonth = (history: Asset["histories"][number]) => {
    monthForm.setFieldsValue({ month: dayjs(`${history.month}-01`), balance: Number(history.balance) });
    setMonthDraft({ historyId: history.id });
  };

  const startNewAssetMonth = () => {
    const historyAsset = assets.find((asset) => asset.id === historyAssetId);
    const months = historyAsset?.histories.map((history) => history.month) ?? [];
    const suggested = suggestSnapshotMonth([]);
    const latest = [...months].sort().at(-1);
    const next = !latest || !months.includes(suggested) ? suggested : shiftHouseholdMonth(latest, 1);
    monthForm.setFieldsValue({
      month: dayjs(`${next}-01`),
      balance: historyAsset ? Number(historyAsset.balance) : 0,
    });
    setMonthDraft({ historyId: null });
  };

  const saveAssetMonth = async (values: MonthFormValues) => {
    const historyAsset = assets.find((asset) => asset.id === historyAssetId);
    if (!historyAsset || !monthDraft) return;
    const saved = await save("PUT", {
      resource: "asset",
      historyOnly: true,
      id: historyAsset.id,
      historyId: monthDraft.historyId,
      month: values.month.format("YYYY-MM"),
      balance: values.balance,
    }, "已保存该月");
    if (saved) setMonthDraft(null);
  };

  const closeAsset = () => {
    setAssetOpen(false);
  };

  const openPolicy = (policy?: Policy, plan?: InsurancePlan) => {
    setEditingPolicy(policy || null);
    setPolicyPlan(plan || null);
    setPolicyCopyMode(null);
    policyForm.resetFields();
    policyForm.setFieldsValue(policy ? {
      name: policy.name,
      provider: policy.provider || undefined,
      policyNumber: policy.policyNumber || undefined,
      type: plan?.type || policy.type,
      insuredMemberId: plan?.insuredMemberId || policy.insuredMemberId || undefined,
      coverageMode: plan?.mode || "LONG_TERM",
      coverageAmount: Number(policy.coverageAmount),
      annualPremium: Number(policy.annualPremium),
      startDate: policy.startDate ? dayjs(policy.startDate) : undefined,
      maturityDate: policy.maturityDate ? dayjs(policy.maturityDate) : undefined,
      refundableAmount: Number(policy.refundableAmount),
      active: policy.active,
      remark: policy.remark || undefined,
    } : {
      name: "",
      type: "ACCIDENT",
      coverageMode: "ANNUAL",
      coverageAmount: 0,
      annualPremium: 0,
      refundableAmount: 0,
      active: true,
    });
    setPolicyOpen(true);
  };

  const openAnnualPolicy = (plan: InsurancePlan, mode: "renew" | "replace" | "backfill") => {
    const previous = mode === "backfill" ? plan.policies.at(-1) : plan.policies[0];
    if (!previous) return;
    const replaceProduct = mode === "replace";
    const period = mode === "backfill"
      ? previousAnnualPolicyPeriod(previous.startDate!, previous.maturityDate!)
      : nextAnnualPolicyPeriod(previous.maturityDate);
    setEditingPolicy(null);
    setPolicyPlan(plan);
    setPolicyCopyMode(mode);
    policyForm.resetFields();
    policyForm.setFieldsValue({
      name: replaceProduct ? "" : previous.name,
      provider: replaceProduct ? undefined : previous.provider || undefined,
      policyNumber: undefined,
      type: plan.type,
      insuredMemberId: plan.insuredMemberId || undefined,
      coverageMode: plan.mode,
      coverageAmount: replaceProduct ? 0 : Number(previous.coverageAmount),
      annualPremium: 0,
      startDate: dayjs(period.startDate),
      maturityDate: dayjs(period.maturityDate),
      refundableAmount: replaceProduct ? 0 : Number(previous.refundableAmount),
      active: true,
      remark: replaceProduct ? undefined : previous.remark || undefined,
    });
    setPolicyOpen(true);
  };

  const openCopiedPlan = (plan: InsurancePlan) => {
    const source = plan.policies[0];
    if (!source) return;
    setEditingPolicy(null);
    setPolicyPlan(null);
    setPolicyCopyMode("copy");
    policyForm.resetFields();
    policyForm.setFieldsValue({
      name: source.name,
      provider: source.provider || undefined,
      policyNumber: undefined,
      type: plan.type,
      insuredMemberId: undefined,
      coverageMode: plan.mode,
      coverageAmount: Number(source.coverageAmount),
      annualPremium: Number(source.annualPremium),
      startDate: source.startDate ? dayjs(source.startDate) : undefined,
      maturityDate: source.maturityDate ? dayjs(source.maturityDate) : undefined,
      refundableAmount: Number(source.refundableAmount),
      active: true,
      remark: source.remark || undefined,
    });
    setPolicyOpen(true);
  };

  const closePolicy = () => {
    setPolicyOpen(false);
    setEditingPolicy(null);
    setPolicyPlan(null);
    setPolicyCopyMode(null);
    policyForm.resetFields();
  };

  const openPayment = (policy: Policy) => {
    const existing = policy.premiumPayments.find((payment) => payment.year === currentYear);
    setPaymentPolicy(policy);
    paymentForm.setFieldsValue({
      year: currentYear,
      amount: existing ? Number(existing.amount) : Number(policy.annualPremium),
      paidAt: existing ? dayjs(existing.paidAt) : dayjs(),
    });
    setPaymentOpen(true);
  };

  const historyDirection = directions.find((direction) => direction.id === historyDirectionId) || null;
  const historyAsset = assets.find((asset) => asset.id === historyAssetId) || null;
  const platform = (value: string) => platformOptions.find((option) => option.value === value);
  const policyType = (value: string) => policyTypeOptions.find((option) => option.value === value)?.label || value;

  const directionCards = directions.length ? (
    <Row gutter={[16, 16]}>
      {directions.map((direction) => {
        const stale = isHouseholdAssetUpdateDue(direction.snapshotMonth ? [`${direction.snapshotMonth}-15T12:00:00.000Z`] : [""]);
        const netWorthMonth = direction.latestNetWorthDate?.slice(0, 7);
        return (
          <Col xs={24} md={12} xl={8} key={direction.id}>
            <Card title={<Flex gap={8} wrap><span style={{ overflowWrap: "anywhere" }}>{direction.name}</span><Tag color="geekblue">投资方向</Tag></Flex>} style={{ height: "100%" }}>
              <Statistic value={Number(direction.snapshotValue || 0)} precision={2} prefix="¥" valueStyle={{ fontSize: 24 }} />
              <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
                <Descriptions.Item label="归属">{direction.householdMember?.name || "家庭共有"}</Descriptions.Item>
                <Descriptions.Item label="快照月份">
                  <Space wrap>{direction.snapshotMonth || "尚未同步"}{stale && <Tag color="warning">待更新</Tag>}</Space>
                </Descriptions.Item>
                <Descriptions.Item label="最新净值">{direction.latestNetWorthDate || "暂无"}</Descriptions.Item>
                <Descriptions.Item label="当前可同步市值">{money(direction.currentValue)}</Descriptions.Item>
              </Descriptions>
              {netWorthMonth && direction.snapshotMonth && netWorthMonth !== direction.snapshotMonth && (
                <Text type="secondary" style={{ fontSize: 12 }}>当前市值对应的净值月份是 {netWorthMonth}</Text>
              )}
              {direction.snapshots.length > 0 && (
                <Button block style={{ marginTop: 12 }} onClick={() => setHistoryDirectionId(direction.id)}>
                  月份记录（{direction.snapshots.length}）
                </Button>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  ) : <Empty description="请先在投资方向中设置归属成员" />;

  const assetCards = assets.length ? (
    <Row gutter={[16, 16]}>
      {assets.map((asset) => {
        const option = platform(asset.platform);
        const assetMonth = asset.histories[0]?.month || dayjs(asset.asOfDate).format("YYYY-MM");
        const stale = isHouseholdAssetUpdateDue([asset.histories[0]?.asOfDate || asset.asOfDate]);
        return (
          <Col xs={24} md={12} xl={8} key={asset.id} style={{ display: "flex" }}>
            <Card
              title={<Flex gap={8} wrap align="center"><span style={{ overflowWrap: "anywhere" }}>{asset.name}</span><Tag color={option?.color}>{option?.label || asset.platform}</Tag></Flex>}
              extra={<Popconfirm title="删除这个资产账户？" onConfirm={() => remove("asset", asset.id)}>
                <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${asset.name}`} />
              </Popconfirm>}
              style={{ flex: 1, display: "flex", flexDirection: "column" }}
              styles={{ body: { display: "flex", flex: 1, flexDirection: "column" } }}
            >
              <Flex vertical gap={12} style={{ flex: 1 }}>
                <Statistic value={Number(asset.balance)} precision={2} prefix="¥" valueStyle={{ fontSize: 24 }} />
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="归属">{asset.member?.name || "家庭共有"}</Descriptions.Item>
                  <Descriptions.Item label="数据月份">
                    <Space wrap>{assetMonth}{stale && <Tag color="warning">待更新</Tag>}</Space>
                  </Descriptions.Item>
                  {asset.remark && <Descriptions.Item label="备注">{asset.remark}</Descriptions.Item>}
                </Descriptions>
                <Flex vertical gap={8} style={{ marginTop: "auto" }}>
                  <Button block onClick={() => openAsset(asset)}>编辑账户</Button>
                  <Button block onClick={() => openAssetHistory(asset)}>月份记录（{asset.histories.length}）</Button>
                </Flex>
              </Flex>
            </Card>
          </Col>
        );
      })}
    </Row>
  ) : <Empty description="还没有家庭资产账户" />;

  const renderPlanCard = (plan: InsurancePlan) => {
        const latestPolicy = plan.policies[0];
        const visiblePolicies = plan.mode === "ANNUAL" ? plan.policies.slice(0, 1) : plan.policies;
        const historicalPolicies = plan.mode === "ANNUAL" ? plan.policies.slice(1) : [];
        const renderPolicyCard = (policy: Policy, stretch = false) => {
          const paid = policy.premiumPayments.find((payment) => payment.year === currentYear);
          const expired = policy.maturityDate ? dayjs(policy.maturityDate).isBefore(dayjs(), "day") : false;
          const future = policy.startDate ? dayjs(policy.startDate).isAfter(dayjs(), "day") : false;
          const status = !policy.active ? "已停效" : expired ? "已到期" : future ? "待生效" : "保障中";
          return (
            <Card
              key={policy.id}
              type="inner"
              size="small"
              style={{ display: "flex", flex: stretch ? 1 : undefined, flexDirection: "column" }}
              styles={{ body: { display: "flex", flex: 1, flexDirection: "column" } }}
              title={<Flex gap={8} wrap align="center"><span style={{ overflowWrap: "anywhere" }}>{policy.name}</span><Tag color={status === "保障中" ? "success" : status === "待生效" ? "processing" : "default"}>{status}</Tag></Flex>}
              extra={<Space size={4}>
                <Button type="text" icon={<EditOutlined />} onClick={() => { setHistoryPlanId(null); openPolicy(policy, plan); }} aria-label={`编辑${policy.name}`} />
                <Popconfirm title="删除这张实际保单及缴费记录？" onConfirm={() => remove("policy", policy.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${policy.name}`} />
                </Popconfirm>
              </Space>}
            >
              <Flex vertical gap={12} style={{ height: "100%" }}>
                <Row gutter={[12, 12]}>
                  <Col xs={12}><Statistic title="保额" value={Number(policy.coverageAmount)} precision={0} prefix="¥" valueStyle={{ fontSize: 18 }} /></Col>
                  <Col xs={12}><Statistic title={plan.mode === "ANNUAL" ? "当期保费" : "年保费"} value={Number(policy.annualPremium)} precision={2} prefix="¥" valueStyle={{ fontSize: 18 }} /></Col>
                </Row>
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="保险公司">{policy.provider || "未填写"}</Descriptions.Item>
                  {policy.policyNumber && <Descriptions.Item label="保单号"><Text copyable style={{ overflowWrap: "anywhere" }}>{policy.policyNumber}</Text></Descriptions.Item>}
                  {(policy.startDate || policy.maturityDate) && <Descriptions.Item label="保障期间">{policy.startDate ? dayjs(policy.startDate).format("YYYY-MM-DD") : "未填写"} 至 {policy.maturityDate ? dayjs(policy.maturityDate).format("YYYY-MM-DD") : "未填写"}</Descriptions.Item>}
                  {Number(policy.refundableAmount) > 0 && <Descriptions.Item label="到期可退"><Text strong>{money(policy.refundableAmount)}</Text></Descriptions.Item>}
                  {plan.mode === "LONG_TERM" && (
                    <Descriptions.Item label={`${currentYear} 年保费`}>
                      {paid ? <Tag color="success">已缴 {money(paid.amount)}</Tag> : <Tag color="warning">未记录</Tag>}
                    </Descriptions.Item>
                  )}
                  {plan.mode === "LONG_TERM" && policy.premiumPayments.length > 0 && (
                    <Descriptions.Item label="缴费记录">
                      <Flex gap={4} wrap>{policy.premiumPayments.map((payment) => <Tag key={payment.id}>{payment.year} · {money(payment.amount)}</Tag>)}</Flex>
                    </Descriptions.Item>
                  )}
                </Descriptions>
              </Flex>
            </Card>
          );
        };
        return (
          <Col xs={24} xl={12} key={plan.id} style={{ display: "flex" }}>
            <Card
              title={<Flex gap={8} wrap align="center"><span style={{ overflowWrap: "anywhere" }}>{plan.insuredMember?.name || "未指定成员"} · {policyType(plan.type)}</span><Tag color={plan.mode === "ANNUAL" ? "cyan" : "blue"}>{plan.mode === "ANNUAL" ? "一年期" : "长期缴费"}</Tag></Flex>}
              style={{ width: "100%", display: "flex", flexDirection: "column" }}
              styles={{ body: { display: "flex", flex: 1, flexDirection: "column" } }}
            >
              <Flex vertical gap={12} style={{ flex: 1 }}>
                <div>
                  <Statistic title="累计缴费" value={cumulativeInsurancePremium(plan.mode, plan.policies)} precision={2} prefix="¥" valueStyle={{ fontSize: 20 }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{plan.mode === "LONG_TERM" ? "未单独记录的年度按年保费自动估算" : "按各期实际保费汇总"}</Text>
                </div>
                {visiblePolicies.map((policy) => renderPolicyCard(policy, visiblePolicies.length === 1))}
                {historicalPolicies.length > 0 && (
                  <>
                    <Button block onClick={() => setHistoryPlanId(plan.id)}>查看历年保单（{historicalPolicies.length}）</Button>
                    <Modal
                      title={`历年保单 · ${plan.insuredMember?.name || "未指定成员"} · ${policyType(plan.type)}`}
                      open={historyPlanId === plan.id}
                      onCancel={() => setHistoryPlanId(null)}
                      footer={null}
                      width={800}
                      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
                    >
                      <Flex vertical gap={12}>{historicalPolicies.map((policy) => renderPolicyCard(policy))}</Flex>
                    </Modal>
                  </>
                )}
                {plan.mode === "ANNUAL" && latestPolicy && (
                  <Row gutter={[8, 8]} style={{ marginTop: "auto" }}>
                    <Col xs={24} sm={12}><Button block icon={<CopyOutlined />} onClick={() => { setDirectCopyPlan(plan); setCopyTargetMemberId(undefined); }}>复制给成员</Button></Col>
                    <Col xs={24} sm={12}><Button block icon={<PlusOutlined />} onClick={() => openAnnualPolicy(plan, "backfill")}>补录往年</Button></Col>
                    <Col xs={24} sm={12}><Button block icon={<CopyOutlined />} onClick={() => openAnnualPolicy(plan, "renew")}>续保下一年</Button></Col>
                    <Col xs={24} sm={12}><Button block icon={<SwapOutlined />} onClick={() => openAnnualPolicy(plan, "replace")}>更换产品</Button></Col>
                  </Row>
                )}
                {plan.mode === "LONG_TERM" && latestPolicy && (
                  <Row gutter={[8, 8]} style={{ marginTop: "auto" }}>
                    <Col xs={24} sm={latestPolicy.active && Number(latestPolicy.annualPremium) > 0 ? 12 : 24}>
                      <Button block icon={<CopyOutlined />} onClick={() => openCopiedPlan(plan)}>复制给家庭成员</Button>
                    </Col>
                    {latestPolicy.active && Number(latestPolicy.annualPremium) > 0 && (
                      <Col xs={24} sm={12}><Button block onClick={() => openPayment(latestPolicy)}>{latestPolicy.premiumPayments.some((payment) => payment.year === currentYear) ? "修改本年缴费" : "记录本年缴费"}</Button></Col>
                    )}
                  </Row>
                )}
              </Flex>
            </Card>
          </Col>
        );
  };

  const policyCards = insurancePlans.length ? (
    <Flex vertical gap={24}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}><Card size="small"><Statistic title="累计缴费" value={premiumDashboard.total} precision={2} prefix="¥" /></Card></Col>
        <Col xs={24} sm={12} lg={8}><Card size="small"><Statistic title={`${currentYear} 年保费`} value={premiumDashboard.current} precision={2} prefix="¥" /></Card></Col>
        <Col xs={24} sm={12} lg={8}><Card size="small"><Statistic title="保障项目" value={insurancePlans.length} suffix="项" /></Card></Col>
      </Row>
      <Card title="年度保费">
        {premiumDashboard.byYear.length ? (
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={premiumDashboard.byYear} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(value) => `¥${Number(value).toLocaleString("zh-CN")}`} width={88} />
                <ChartTooltip formatter={(value) => money(Number(value))} />
                <Bar dataKey="total" name="保费" fill="#1677ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty description="暂无保费记录" />}
        <Text type="secondary" style={{ fontSize: 12 }}>长期险未单独记录的年度按年保费估算，实缴记录优先。</Text>
      </Card>
      <Tabs
        tabBarGutter={16}
        items={premiumDashboard.memberTotals.map((group) => ({
          key: group.key,
          label: <Space size={6}><TeamOutlined />{group.name}<Tag>{group.plans.length}</Tag></Space>,
          children: (
            <Flex vertical gap={12}>
              <Space wrap><Tag>累计 {money(group.total)}</Tag><Tag color="blue">本年 {money(group.current)}</Tag></Space>
              <Row gutter={[16, 16]}>{group.plans.map(renderPlanCard)}</Row>
            </Flex>
          ),
        }))}
      />
    </Flex>
  ) : <Empty description="还没有保险保障项目" />;

  const assetMonthEditor = (
    <Form form={monthForm} layout="vertical" onFinish={saveAssetMonth} style={{ padding: 12, background: "#e6f4ff", borderRadius: 8 }}>
      <Row gutter={12}>
        <Col xs={24} sm={12}>
          <Form.Item name="month" label="月份" rules={[{ required: true, message: "请选择月份" }]}>
            <DatePicker
              picker="month"
              format="YYYY-MM"
              style={{ width: "100%" }}
              disabledDate={(current) => {
                const key = current?.format("YYYY-MM");
                return Boolean(key && historyAsset?.histories.some((history) => history.month === key && history.id !== monthDraft?.historyId));
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item name="balance" label="余额" rules={[{ required: true, message: "请填写余额" }]}>
            <InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>
      <Flex gap={8} wrap>
        <Button type="primary" htmlType="submit" loading={submitting}>保存该月</Button>
        <Button onClick={() => setMonthDraft(null)}>取消</Button>
      </Flex>
    </Form>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Flex justify="space-between" align="flex-start" gap={16} wrap style={{ marginBottom: 20 }}>
          <div>
            <Title level={2} style={{ margin: 0 }}><BankOutlined /> 家庭资产</Title>
            <Text type="secondary">手动维护家庭账户、养老金与保险保障</Text>
          </div>
          <Space wrap>
            <Select
              value={selectedMemberId}
              onChange={(value) => setSelectedMemberId(value)}
              style={{ width: 160, maxWidth: "100%" }}
              options={[
                { value: null, label: "全部成员" },
                ...members.map((member) => ({ value: member.id, label: member.name })),
              ]}
            />
            <Button onClick={openSync} loading={submitting}>同步投资方向</Button>
            <Button icon={<TeamOutlined />} onClick={() => openMember()}>添加成员</Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => openPolicy()}>添加保险保障</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openAsset()}>添加资产</Button>
          </Space>
        </Flex>

        {updateDue && (
          <Alert
            showIcon
            type="warning"
            message="月底资产更新提醒"
            description="存在本月尚未更新的资产账户，请按各平台最新余额更新。"
            style={{ marginBottom: 16 }}
          />
        )}
        {unpaidPolicies.length > 0 && (
          <Alert
            showIcon
            type="info"
            message={`${currentYear} 年还有 ${unpaidPolicies.length} 张有效保单未记录缴费`}
            description={unpaidPolicies.map((policy) => policy.name).join("、")}
            style={{ marginBottom: 16 }}
          />
        )}
        {renewalDuePlans.length > 0 && (
          <Alert
            showIcon
            type="warning"
            message={`${renewalDuePlans.length} 个一年期保障项目需要续保`}
            description={renewalDuePlans.map((plan) => `${plan.insuredMember?.name || "未指定成员"} · ${policyType(plan.type)}`).join("、")}
            style={{ marginBottom: 16 }}
          />
        )}
        {gapPlans.length > 0 && (
          <Alert
            showIcon
            type="error"
            message={`${gapPlans.length} 个一年期保障项目存在保障断档`}
            description={gapPlans.map((plan) => `${plan.insuredMember?.name || "未指定成员"} · ${policyType(plan.type)}`).join("、")}
            style={{ marginBottom: 16 }}
          />
        )}

        <Spin spinning={loading}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="家庭总资产" value={totals.all} precision={2} prefix="¥" styles={{ content: { fontSize: 22 } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="投资资产" value={totals.investments} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#1677ff" } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="现金流 / 养老金" value={totals.cash + totals.pension} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#52c41a" } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="保险到期可退" value={totals.refundable} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#fa8c16" } }} /></Card></Col>
          </Row>

          <Card title="家庭资产月度走势" style={{ marginBottom: 20 }}>
            {history.length ? (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <LineChart data={history} margin={{ top: 16, right: 8, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" interval="preserveStartEnd" minTickGap={8} tick={MonthAxisTick} tickLine={false} />
                    <YAxis width={52} tickFormatter={(value) => formatWanAxis(Number(value))} />
                    <ChartTooltip formatter={(value) => money(Number(value))} />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="总资产" stroke="#1677ff" strokeWidth={2} />
                    <Line type="monotone" dataKey="directions" name="投资方向" stroke="#722ed1" />
                    <Line type="monotone" dataKey="QIEMAN" name="且慢" stroke="#13c2c2" />
                    <Line type="monotone" dataKey="YUEBAO" name="余额宝" stroke="#52c41a" />
                    <Line type="monotone" dataKey="HUATAI" name="华泰" stroke="#fa8c16" />
                    <Line type="monotone" dataKey="PERSONAL_PENSION" name="个人养老金" stroke="#eb2f96" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty description="月底更新资产后，这里会显示月度走势" />}
          </Card>

          <Card>
            <Tabs items={[
              {
                key: "assets",
                label: `资产账户 (${assets.length + directions.length})`,
                children: <><Title level={5}>手动资产</Title>{assetCards}<Divider /><Title level={5}>投资方向（月度快照）</Title>{directionCards}</>,
              },
              { key: "policies", label: `保险保障 (${insurancePlans.length})`, children: policyCards },
              {
                key: "members",
                label: `家庭成员 (${members.length})`,
                children: members.length ? (
                  <Row gutter={[12, 12]}>
                    {members.map((member) => (
                      <Col xs={24} sm={12} lg={8} key={member.id}>
                        <Card size="small">
                          <Flex justify="space-between" align="center" gap={8}>
                            <Space wrap><TeamOutlined /><Text strong>{member.name}</Text>{member.relation && <Tag>{member.relation}</Tag>}</Space>
                            <Space size={4}>
                              <Button type="text" icon={<EditOutlined />} onClick={() => openMember(member)} aria-label={`编辑${member.name}`} />
                              <Popconfirm title="删除成员？资产与保单会保留，但不再关联此成员。" onConfirm={() => remove("member", member.id)}>
                                <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${member.name}`} />
                              </Popconfirm>
                            </Space>
                          </Flex>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : <Empty description="还没有家庭成员" />,
              },
            ]} />
          </Card>
        </Spin>
      </div>

      <Modal title={editingMember ? "编辑家庭成员" : "添加家庭成员"} open={memberOpen} onCancel={() => setMemberOpen(false)} onOk={() => memberForm.submit()} confirmLoading={submitting} forceRender>
        <Form form={memberForm} layout="vertical" onFinish={async (values) => {
          if (await save(editingMember ? "PUT" : "POST", { resource: "member", id: editingMember?.id, ...values })) setMemberOpen(false);
        }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}><Input maxLength={50} /></Form.Item>
          <Form.Item name="relation" label="与我的关系"><Input placeholder="本人、配偶、子女、父母" maxLength={50} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingAsset ? "编辑资产账户" : "添加资产账户"}
        open={assetOpen}
        onCancel={closeAsset}
        onOk={() => assetForm.submit()}
        confirmLoading={submitting}
        okText={editingAsset ? "保存账户" : "添加"}
        cancelText={editingAsset ? "关闭" : "取消"}
        width="min(640px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
        forceRender
      >
        <Form form={assetForm} layout="vertical" onFinish={async (values) => {
          if (!editingAsset) {
            if (!values.month) return;
            if (await save("POST", {
              resource: "asset",
              ...values,
              month: values.month.format("YYYY-MM"),
            })) closeAsset();
            return;
          }
          if (await save("PUT", {
            resource: "asset",
            id: editingAsset.id,
            name: values.name,
            platform: values.platform,
            memberId: values.memberId,
            remark: values.remark,
          })) closeAsset();
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="name" label="账户名称" rules={[{ required: true }]}><Input placeholder="例如：且慢长期账户" maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={platformOptions.map(({ value, label }) => ({ value, label }))} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="memberId" label="归属成员"><Select allowClear placeholder="家庭共有" options={members.map((member) => ({ value: member.id, label: member.name }))} /></Form.Item></Col>
            {!editingAsset && (
              <>
                <Col xs={24} sm={12}><Form.Item name="balance" label="首月余额" rules={[{ required: true, message: "请填写余额" }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
                <Col xs={24} sm={12}><Form.Item name="month" label="起始月份" rules={[{ required: true, message: "请选择月份" }]}><DatePicker picker="month" format="YYYY-MM" style={{ width: "100%" }} /></Form.Item></Col>
              </>
            )}
            <Col xs={24}><Form.Item name="remark" label="备注"><Input.TextArea rows={2} maxLength={500} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={<span style={{ overflowWrap: "anywhere" }}>{historyAsset ? `月份记录 · ${historyAsset.name}` : "月份记录"}</span>}
        open={historyAssetId !== null}
        onCancel={closeAssetHistory}
        footer={null}
        width="min(640px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        {historyAsset ? (
          <Flex vertical gap={8}>
            <Flex justify="space-between" align="center" gap={8} wrap>
              <Text type="secondary">在这里查看和补记每个月的余额。</Text>
              <Button size="small" icon={<PlusOutlined />} onClick={startNewAssetMonth}>新增月份</Button>
            </Flex>
            {monthDraft?.historyId === null && assetMonthEditor}
            {historyAsset.histories.length ? historyAsset.histories.map((history) => (
              monthDraft?.historyId === history.id ? <div key={history.id}>{assetMonthEditor}</div> : (
                <Flex key={history.id} justify="space-between" align="center" gap={8} wrap style={{ padding: "8px 12px", background: "#fafafa", borderRadius: 8 }}>
                  <Text>{history.month}</Text>
                  <Text style={{ overflowWrap: "anywhere" }}>{money(history.balance)}</Text>
                  <Space size={0} wrap>
                    <Button type="link" size="small" onClick={() => editAssetMonth(history)}>修改</Button>
                    {historyAsset.histories.length > 1 && (
                      <Popconfirm title={`删除 ${history.month} 的记录？`} onConfirm={() => remove("assetHistory", history.id)}>
                        <Button type="link" size="small" danger>删除</Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Flex>
              )
            )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有月份记录" />}
          </Flex>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="账户不存在" />}
      </Modal>

      <Modal
        title="同步投资方向快照"
        open={syncOpen}
        onCancel={() => setSyncOpen(false)}
        onOk={confirmSync}
        confirmLoading={submitting}
        okText="写入该月快照"
        okButtonProps={{ disabled: !syncMonth || syncDirections.length === 0 }}
        width="min(640px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <Flex vertical gap={12}>
          <Text>快照记入所选月份，不按点击同步的当天计算。当前市值来自最新净值日 {syncNetWorthDate || "未知"}。</Text>
          <DatePicker picker="month" format="YYYY-MM" value={syncMonth} onChange={setSyncMonth} style={{ width: "100%" }} />
          {syncMonth && syncDirections.some((direction) => direction.snapshots.some((snapshot) => snapshot.month === syncMonth.format("YYYY-MM"))) && (
            <Alert showIcon type="warning" message="该月已有快照，写入后会用当前市值覆盖，其他月份保持不变。" />
          )}
          {syncDirections.length ? syncDirections.map((direction) => {
            const existing = direction.snapshots.find((snapshot) => snapshot.month === syncMonth?.format("YYYY-MM"));
            return (
              <Flex key={direction.id} justify="space-between" align="flex-start" gap={8} wrap style={{ padding: "8px 12px", background: "#fafafa", borderRadius: 8 }}>
                <Text style={{ overflowWrap: "anywhere" }}>{direction.name}</Text>
                <Flex vertical align="flex-end">
                  <Text>当前市值 {money(direction.currentValue)}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{existing ? `该月已有 ${money(existing.value)}` : "该月尚未记录"}</Text>
                </Flex>
              </Flex>
            );
          }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="没有可同步的投资方向" />}
        </Flex>
      </Modal>

      <Modal
        title={`月份记录${historyDirection ? ` · ${historyDirection.name}` : ""}`}
        open={historyDirectionId !== null}
        onCancel={() => setHistoryDirectionId(null)}
        footer={null}
        width="min(640px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        {historyDirection && historyDirection.snapshots.length > 0 ? (
          <Flex vertical gap={8}>
            {historyDirection.snapshots.map((snapshot) => (
              <Flex key={snapshot.id} justify="space-between" align="center" gap={8} wrap style={{ padding: "8px 12px", background: "#fafafa", borderRadius: 8 }}>
                <Text>{snapshot.month}</Text>
                <Text style={{ overflowWrap: "anywhere" }}>{money(snapshot.value)}</Text>
                <Space size={0} wrap>
                  <Button type="link" size="small" onClick={() => { setSnapshotEdit({ id: snapshot.id, directionName: historyDirection.name }); setSnapshotMonth(dayjs(`${snapshot.month}-01`)); }}>调整</Button>
                  <Popconfirm title={`删除 ${snapshot.month} 的快照？`} onConfirm={() => remove("directionSnapshot", snapshot.id)}>
                    <Button type="link" size="small" danger>删除</Button>
                  </Popconfirm>
                </Space>
              </Flex>
            ))}
          </Flex>
        ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有月份记录" />}
      </Modal>

      <Modal
        title={`调整快照月份${snapshotEdit ? `：${snapshotEdit.directionName}` : ""}`}
        open={!!snapshotEdit}
        onCancel={() => setSnapshotEdit(null)}
        confirmLoading={submitting}
        onOk={async () => {
          if (!snapshotEdit || !snapshotMonth) return;
          if (await save("PUT", { resource: "directionSnapshot", id: snapshotEdit.id, month: snapshotMonth.format("YYYY-MM") }, "已调整快照月份")) setSnapshotEdit(null);
        }}
        width="min(420px, calc(100vw - 32px))"
      >
        <Flex vertical gap={8}>
          <Text type="secondary">只改这条快照所属的月份，金额保持不变。目标月份已有快照时需要先删除。</Text>
          <DatePicker picker="month" format="YYYY-MM" value={snapshotMonth} onChange={setSnapshotMonth} style={{ width: "100%" }} />
        </Flex>
      </Modal>

      <Modal
        title={`复制保障：${directCopyPlan ? policyType(directCopyPlan.type) : ""}`}
        open={!!directCopyPlan}
        onCancel={() => { setDirectCopyPlan(null); setCopyTargetMemberId(undefined); }}
        onOk={copyAnnualPlan}
        okButtonProps={{ disabled: !copyTargetMemberId }}
        confirmLoading={submitting}
      >
        <Alert showIcon type="info" message="将复制全部历年保单及各年保费；若已复制过则只补齐缺失记录，唯一保单号不会复制。" style={{ marginBottom: 16 }} />
        <Select
          value={copyTargetMemberId}
          onChange={setCopyTargetMemberId}
          placeholder="选择要复制给的家庭成员"
          style={{ width: "100%" }}
          options={members.filter((member) => member.id !== directCopyPlan?.insuredMemberId).map((member) => ({ value: member.id, label: `${member.name}${member.relation ? `（${member.relation}）` : ""}` }))}
        />
      </Modal>

      <Modal title={editingPolicy ? "编辑实际保单" : policyCopyMode === "renew" ? "续保下一年" : policyCopyMode === "replace" ? "更换保险产品" : policyCopyMode === "backfill" ? "补录往年保单" : policyCopyMode === "copy" ? "复制保障给家庭成员" : "添加保险保障"} open={policyOpen} onCancel={closePolicy} onOk={() => policyForm.submit()} confirmLoading={submitting} width={720} forceRender>
        {policyCopyMode === "copy" && <Alert showIcon type="info" message="产品信息已复制，请选择新的被保人并确认保障日期和年保费；原缴费记录不会复制。" style={{ marginBottom: 16 }} />}
        <Form form={policyForm} layout="vertical" onFinish={async (values) => {
          if (await save(editingPolicy ? "PUT" : "POST", {
            resource: "policy",
            id: editingPolicy?.id,
            planId: policyPlan?.id,
            ...values,
            startDate: values.startDate?.toISOString() || null,
            maturityDate: values.maturityDate?.toISOString() || null,
          })) closePolicy();
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="name" label="产品 / 保单名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="provider" label="保险公司"><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="policyNumber" label="保单号"><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="type" label="险种" rules={[{ required: true }]}><Select disabled={!!policyPlan} options={policyTypeOptions} onChange={(type) => {
              if (!policyPlan) policyForm.setFieldValue("coverageMode", type === "ACCIDENT" || type === "MEDICAL" ? "ANNUAL" : "LONG_TERM");
            }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="insuredMemberId" label="被保人" rules={policyCopyMode === "copy" ? [{ required: true, message: "请选择新的被保人" }] : undefined}><Select disabled={!!policyPlan} allowClear options={members.map((member) => ({ value: member.id, label: member.name }))} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="coverageMode" label="保障方式" rules={[{ required: true }]}><Select disabled={!!policyPlan} options={[{ value: "ANNUAL", label: "一年期（每年一张实际保单）" }, { value: "LONG_TERM", label: "长期缴费（同一保单逐年缴费）" }]} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="coverageAmount" label="保额" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="annualPremium" label={policyCoverageMode === "ANNUAL" ? "当期保费" : "年保费"} rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="startDate" label="保障生效日" rules={[{ required: policyCoverageMode === "ANNUAL", message: "请填写保障生效日" }]}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="maturityDate" label="保障到期日" rules={[{ required: policyCoverageMode === "ANNUAL", message: "请填写保障到期日" }]}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="refundableAmount" label="到期可退金额" tooltip="护理险等到期可返还产品填写，无则填 0" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="active" label="保单有效" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col xs={24}><Form.Item name="remark" label="备注"><Input.TextArea rows={2} maxLength={500} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={`记录缴费：${paymentPolicy?.name || ""}`} open={paymentOpen} onCancel={() => setPaymentOpen(false)} onOk={() => paymentForm.submit()} confirmLoading={submitting} forceRender>
        <Form form={paymentForm} layout="vertical" onFinish={async (values) => {
          if (!paymentPolicy) return;
          if (await save("POST", { resource: "payment", policyId: paymentPolicy.id, ...values, paidAt: values.paidAt.toISOString() })) setPaymentOpen(false);
        }}>
          <Form.Item name="year" label="缴费年度" rules={[{ required: true }]}><InputNumber min={2000} max={2100} precision={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="amount" label="实缴金额" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="paidAt" label="缴费日期" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
