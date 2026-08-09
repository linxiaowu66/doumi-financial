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
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HouseholdHistoryPoint, isHouseholdAssetUpdateDue } from "@/lib/household-assets";

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
  histories: Array<{ id: number; balance: string; asOfDate: string }>;
}

interface Direction {
  id: number;
  name: string;
  householdMember: Member | null;
  currentValue: number;
  snapshotValue: string | null;
  snapshotAsOfDate: string | null;
}

interface Payment {
  id: number;
  year: number;
  amount: string;
  paidAt: string;
}

interface Policy {
  id: number;
  insuredMemberId: number | null;
  insuredMember: Member | null;
  name: string;
  provider: string | null;
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

interface AssetFormValues {
  name: string;
  platform: string;
  memberId?: number;
  balance: number;
  asOfDate: Dayjs;
  remark?: string;
}

interface PolicyFormValues {
  name: string;
  provider?: string;
  type: string;
  insuredMemberId?: number;
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

export default function HouseholdAssetsPage() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
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
  const [paymentPolicy, setPaymentPolicy] = useState<Policy | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [memberForm] = Form.useForm();
  const [assetForm] = Form.useForm<AssetFormValues>();
  const [policyForm] = Form.useForm<PolicyFormValues>();
  const [paymentForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/household-assets${selectedMemberId === null ? "" : `?memberId=${selectedMemberId}`}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setMembers(data.members);
      setAssets(data.assets);
      setPolicies(data.policies);
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
      refundable: policies.reduce((total, policy) => total + Number(policy.refundableAmount), 0),
    };
  }, [assets, directions, policies]);

  const updateDue = isHouseholdAssetUpdateDue(maintenanceDates);
  const currentYear = dayjs().year();
  const unpaidPolicies = policies.filter(
    (policy) => policy.active
      && Number(policy.annualPremium) > 0
      && !policy.premiumPayments.some((payment) => payment.year === currentYear),
  );

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

  const syncDirections = async () => {
    await save("POST", { resource: "syncDirections" }, "已更新本月投资方向快照");
  };

  const openMember = (member?: Member) => {
    setEditingMember(member || null);
    memberForm.setFieldsValue(member ? { name: member.name, relation: member.relation } : { name: "", relation: "" });
    setMemberOpen(true);
  };

  const openAsset = (asset?: Asset) => {
    setEditingAsset(asset || null);
    assetForm.setFieldsValue(asset ? {
      name: asset.name,
      platform: asset.platform,
      memberId: asset.memberId || undefined,
      balance: Number(asset.balance),
      asOfDate: dayjs(asset.asOfDate),
      remark: asset.remark || undefined,
    } : {
      name: "",
      platform: "QIEMAN",
      balance: 0,
      asOfDate: dayjs(),
    });
    setAssetOpen(true);
  };

  const openPolicy = (policy?: Policy) => {
    setEditingPolicy(policy || null);
    policyForm.setFieldsValue(policy ? {
      name: policy.name,
      provider: policy.provider || undefined,
      type: policy.type,
      insuredMemberId: policy.insuredMemberId || undefined,
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
      coverageAmount: 0,
      annualPremium: 0,
      refundableAmount: 0,
      active: true,
    });
    setPolicyOpen(true);
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

  const platform = (value: string) => platformOptions.find((option) => option.value === value);
  const policyType = (value: string) => policyTypeOptions.find((option) => option.value === value)?.label || value;

  const directionCards = directions.length ? (
    <Row gutter={[16, 16]}>
      {directions.map((direction) => {
        const stale = !direction.snapshotAsOfDate || dayjs(direction.snapshotAsOfDate).format("YYYY-MM") !== dayjs().format("YYYY-MM");
        return (
          <Col xs={24} md={12} xl={8} key={direction.id}>
            <Card title={<Flex gap={8} wrap><span style={{ overflowWrap: "anywhere" }}>{direction.name}</span><Tag color="geekblue">投资方向</Tag></Flex>} style={{ height: "100%" }}>
              <Statistic value={Number(direction.snapshotValue || 0)} precision={2} prefix="¥" valueStyle={{ fontSize: 24 }} />
              <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
                <Descriptions.Item label="归属">{direction.householdMember?.name || "家庭共有"}</Descriptions.Item>
                <Descriptions.Item label="快照日期">
                  <Space>{direction.snapshotAsOfDate ? dayjs(direction.snapshotAsOfDate).format("YYYY-MM-DD") : "尚未同步"}{stale && <Tag color="warning">待更新</Tag>}</Space>
                </Descriptions.Item>
                <Descriptions.Item label="当前可同步市值">{money(direction.currentValue)}</Descriptions.Item>
              </Descriptions>
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
        const stale = dayjs(asset.asOfDate).format("YYYY-MM") !== dayjs().format("YYYY-MM");
        return (
          <Col xs={24} md={12} xl={8} key={asset.id}>
            <Card
              title={<Flex gap={8} wrap align="center"><span style={{ overflowWrap: "anywhere" }}>{asset.name}</span><Tag color={option?.color}>{option?.label || asset.platform}</Tag></Flex>}
              extra={<Space size={4}>
                <Button type="text" icon={<EditOutlined />} onClick={() => openAsset(asset)} aria-label={`编辑${asset.name}`} />
                <Popconfirm title="删除这个资产账户？" onConfirm={() => remove("asset", asset.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${asset.name}`} />
                </Popconfirm>
              </Space>}
              style={{ height: "100%" }}
            >
              <Statistic value={Number(asset.balance)} precision={2} prefix="¥" valueStyle={{ fontSize: 24 }} />
              <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
                <Descriptions.Item label="归属">{asset.member?.name || "家庭共有"}</Descriptions.Item>
                <Descriptions.Item label="数据日期">
                  <Space>{dayjs(asset.asOfDate).format("YYYY-MM-DD")}{stale && <Tag color="warning">待更新</Tag>}</Space>
                </Descriptions.Item>
                {asset.remark && <Descriptions.Item label="备注">{asset.remark}</Descriptions.Item>}
              </Descriptions>
            </Card>
          </Col>
        );
      })}
    </Row>
  ) : <Empty description="还没有家庭资产账户" />;

  const policyCards = policies.length ? (
    <Row gutter={[16, 16]}>
      {policies.map((policy) => {
        const paid = policy.premiumPayments.find((payment) => payment.year === currentYear);
        return (
          <Col xs={24} lg={12} key={policy.id}>
            <Card
              title={<Flex gap={8} wrap align="center"><span style={{ overflowWrap: "anywhere" }}>{policy.name}</span><Tag color={policy.active ? "blue" : "default"}>{policy.active ? policyType(policy.type) : "已停效"}</Tag></Flex>}
              extra={<Space size={4}>
                <Button type="text" icon={<EditOutlined />} onClick={() => openPolicy(policy)} aria-label={`编辑${policy.name}`} />
                <Popconfirm title="删除这张保单及缴费记录？" onConfirm={() => remove("policy", policy.id)}>
                  <Button type="text" danger icon={<DeleteOutlined />} aria-label={`删除${policy.name}`} />
                </Popconfirm>
              </Space>}
              style={{ height: "100%" }}
            >
              <Row gutter={[12, 12]}>
                <Col xs={12}><Statistic title="保额" value={Number(policy.coverageAmount)} precision={0} prefix="¥" valueStyle={{ fontSize: 18 }} /></Col>
                <Col xs={12}><Statistic title="年保费" value={Number(policy.annualPremium)} precision={2} prefix="¥" valueStyle={{ fontSize: 18 }} /></Col>
              </Row>
              <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
                <Descriptions.Item label="被保人">{policy.insuredMember?.name || "未指定"}</Descriptions.Item>
                <Descriptions.Item label="保险公司">{policy.provider || "未填写"}</Descriptions.Item>
                {policy.maturityDate && <Descriptions.Item label="到期日">{dayjs(policy.maturityDate).format("YYYY-MM-DD")}</Descriptions.Item>}
                {Number(policy.refundableAmount) > 0 && <Descriptions.Item label="到期可退"><Text strong>{money(policy.refundableAmount)}</Text></Descriptions.Item>}
                <Descriptions.Item label={`${currentYear} 年保费`}>
                  {paid ? <Tag color="success">已缴 {money(paid.amount)}</Tag> : <Tag color="warning">未记录</Tag>}
                </Descriptions.Item>
                {policy.premiumPayments.length > 0 && (
                  <Descriptions.Item label="缴费记录">
                    <Flex gap={4} wrap>
                      {policy.premiumPayments.map((payment) => (
                        <Tag key={payment.id}>{payment.year} · {money(payment.amount)}</Tag>
                      ))}
                    </Flex>
                  </Descriptions.Item>
                )}
              </Descriptions>
              {policy.active && Number(policy.annualPremium) > 0 && (
                <Button block onClick={() => openPayment(policy)} style={{ marginTop: 8 }}>
                  {paid ? "修改本年缴费" : "记录本年缴费"}
                </Button>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  ) : <Empty description="还没有保险保单" />;

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
            <Button onClick={syncDirections} loading={submitting}>同步本月投资方向</Button>
            <Button icon={<TeamOutlined />} onClick={() => openMember()}>添加成员</Button>
            <Button icon={<SafetyCertificateOutlined />} onClick={() => openPolicy()}>添加保单</Button>
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

        <Spin spinning={loading}>
          <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="家庭总资产" value={totals.all} precision={2} prefix="¥" styles={{ content: { fontSize: 22 } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="投资资产" value={totals.investments} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#1677ff" } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="现金流 / 养老金" value={totals.cash + totals.pension} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#52c41a" } }} /></Card></Col>
            <Col xs={12} lg={6}><Card style={{ height: "100%" }}><Statistic title="保险到期可退" value={totals.refundable} precision={2} prefix="¥" styles={{ content: { fontSize: 22, color: "#fa8c16" } }} /></Card></Col>
          </Row>

          <Card title="家庭资产月度走势" style={{ marginBottom: 20 }}>
            {history.length ? (
              <div style={{ width: "100%", height: 320, overflow: "hidden" }}>
                <ResponsiveContainer>
                  <LineChart data={history} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" minTickGap={20} />
                    <YAxis width={64} tickFormatter={(value) => Number(value).toLocaleString("zh-CN")} />
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
              { key: "policies", label: `保险保单 (${policies.length})`, children: policyCards },
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

      <Modal title={editingAsset ? "编辑资产账户" : "添加资产账户"} open={assetOpen} onCancel={() => setAssetOpen(false)} onOk={() => assetForm.submit()} confirmLoading={submitting} width={640} forceRender>
        <Form form={assetForm} layout="vertical" onFinish={async (values) => {
          if (await save(editingAsset ? "PUT" : "POST", { resource: "asset", id: editingAsset?.id, ...values, asOfDate: values.asOfDate.toISOString() })) setAssetOpen(false);
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="name" label="账户名称" rules={[{ required: true }]}><Input placeholder="例如：且慢长期账户" maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select options={platformOptions.map(({ value, label }) => ({ value, label }))} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="memberId" label="归属成员"><Select allowClear placeholder="家庭共有" options={members.map((member) => ({ value: member.id, label: member.name }))} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="balance" label="当前余额" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="asOfDate" label="数据日期" rules={[{ required: true }]}><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24}><Form.Item name="remark" label="备注"><Input.TextArea rows={2} maxLength={500} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title={editingPolicy ? "编辑保单" : "添加保单"} open={policyOpen} onCancel={() => setPolicyOpen(false)} onOk={() => policyForm.submit()} confirmLoading={submitting} width={720} forceRender>
        <Form form={policyForm} layout="vertical" onFinish={async (values) => {
          if (await save(editingPolicy ? "PUT" : "POST", {
            resource: "policy",
            id: editingPolicy?.id,
            ...values,
            startDate: values.startDate?.toISOString() || null,
            maturityDate: values.maturityDate?.toISOString() || null,
          })) setPolicyOpen(false);
        }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}><Form.Item name="name" label="保单名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="provider" label="保险公司"><Input maxLength={100} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="type" label="险种" rules={[{ required: true }]}><Select options={policyTypeOptions} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="insuredMemberId" label="被保人"><Select allowClear options={members.map((member) => ({ value: member.id, label: member.name }))} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="coverageAmount" label="保额" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="annualPremium" label="年保费" rules={[{ required: true }]}><InputNumber min={0} precision={2} prefix="¥" style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="startDate" label="生效日"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
            <Col xs={24} sm={12}><Form.Item name="maturityDate" label="到期日"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
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
