'use client';

import { useState, useEffect, use, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Flex,
  Typography,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Tag,
  Breadcrumb,
  Divider,
  Radio,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FundOutlined,
  DollarOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
  latestNetWorth?: number | null;
  netWorthDate?: string | null;
  createdAt: string;
  _count?: {
    transactions: number;
    plannedPurchases: number;
  };
}

interface InvestmentDirection {
  id: number;
  name: string;
  expectedAmount: number;
  actualAmount: number;
}

interface FundStats {
  fundId: number;
  holdingShares: number;
  holdingCost: number;
  avgCostPrice: number;
  holdingProfitRate: number; // 持仓收益率
  totalProfitRate: number; // 累计收益率
  totalProfit: number; // 累计收益金额
  totalDividend: number;
  transactionCount: number;
}

interface CategoryTarget {
  id: number;
  directionId: number;
  categoryName: string;
  targetAmount: number;
}

interface DirectionSummary {
  totalInvested: string;
  totalCurrentValue: string;
  totalCost: string;
  holdingProfit: string;
  totalSellProfit: string;
  totalDividendCash: string;
  totalDividendReinvest: string;
  totalProfit: string;
  totalProfitRate: string;
  fundCount: number;
}

export default function DirectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const directionId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [direction, setDirection] = useState<InvestmentDirection | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsStats, setFundsStats] = useState<Map<number, FundStats>>(
    new Map()
  );
  const [categoryTargets, setCategoryTargets] = useState<CategoryTarget[]>([]);
  const [summary, setSummary] = useState<DirectionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>('');
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [form] = Form.useForm();
  const [targetForm] = Form.useForm();
  const [chartData, setChartData] = useState<
    Array<{
      date: string;
      dailyProfit: number;
      cumulativeProfit: number;
      cumulativeProfitRate: number;
    }>
  >([]);
  const [chartDays, setChartDays] = useState<number>(30);
  const [chartLoading, setChartLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [categorySearchValue, setCategorySearchValue] = useState<string>('');

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 加载投资方向详情
  const loadDirection = useCallback(async () => {
    try {
      const response = await fetch(`/api/investment-directions/${directionId}`);
      const data = await response.json();
      setDirection(data);
    } catch {
      message.error('加载投资方向失败');
    }
  }, [directionId]);

  // 加载分类目标
  const loadCategoryTargets = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/category-targets?directionId=${directionId}`
      );
      const data = await response.json();
      setCategoryTargets(data);
    } catch (error) {
      console.error('加载分类目标失败:', error);
    }
  }, [directionId]);

  // 加载汇总统计
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/investment-directions/${directionId}/summary`
      );
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('加载汇总统计失败:', error);
    }
  }, [directionId]);

  // 加载基金列表
  const loadFunds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/funds?directionId=${directionId}`);
      const data = await response.json();
      setFunds(data);

      // 提取已有的分类列表（去重，过滤空值）
      const categories = Array.from(
        new Set(
          data
            .map((fund: Fund) => fund.category)
            .filter((cat: string | null) => cat && cat.trim() !== '')
        )
      ) as string[];
      setCategoryOptions(
        categories.sort().map((cat) => ({ label: cat, value: cat }))
      );

      // 加载每个基金的统计信息
      const statsMap = new Map<number, FundStats>();
      await Promise.all(
        data.map(async (fund: Fund) => {
          try {
            const statsRes = await fetch(
              `/api/funds/${fund.id}/stats${
                fund.latestNetWorth
                  ? `?currentPrice=${encodeURIComponent(
                      fund.latestNetWorth.toString()
                    )}`
                  : ''
              }`
            );
            const stats = await statsRes.json();
            statsMap.set(fund.id, stats);
          } catch (err) {
            console.error(`加载基金${fund.id}统计失败:`, err);
          }
        })
      );
      setFundsStats(statsMap);
    } catch {
      message.error('加载基金列表失败');
    } finally {
      setLoading(false);
    }
  }, [directionId]);

  // 加载图表数据
  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const response = await fetch(
        `/api/investment-directions/${directionId}/daily-profit?days=${chartDays}`
      );
      const data = await response.json();
      if (response.ok && data.data) {
        setChartData(data.data);
      } else {
        console.error('加载图表数据失败:', data.error);
        message.warning(data.error || '加载图表数据失败');
      }
    } catch (error) {
      console.error('加载图表数据失败:', error);
      message.error('加载图表数据失败');
    } finally {
      setChartLoading(false);
    }
  }, [directionId, chartDays]);

  useEffect(() => {
    loadDirection();
    loadFunds();
    loadCategoryTargets();
    loadSummary();
    loadChartData();
  }, [
    directionId,
    loadDirection,
    loadFunds,
    loadCategoryTargets,
    loadSummary,
    loadChartData,
  ]);

  // 打开新建/编辑弹窗
  const handleOpenModal = (fund?: Fund) => {
    if (fund) {
      setEditingFund(fund);
      form.setFieldsValue({
        code: fund.code,
        name: fund.name,
        category: fund.category,
        remark: fund.remark,
      });
    } else {
      setEditingFund(null);
      form.resetFields();
    }
    setCategorySearchValue('');
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (values: {
    code: string;
    name: string;
    category?: string;
    remark?: string;
  }) => {
    try {
      const url = editingFund ? `/api/funds/${editingFund.id}` : '/api/funds';
      const method = editingFund ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          directionId,
        }),
      });

      if (response.ok) {
        message.success(editingFund ? '更新成功' : '创建成功');
        setModalOpen(false);
        form.resetFields();
        loadFunds();
      } else {
        message.error('操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  // 删除基金
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/funds/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('删除成功');
        loadFunds();
      } else {
        message.error('删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  // 打开设置分类目标弹窗
  const handleOpenTargetModal = (
    categoryName: string,
    currentTarget?: number
  ) => {
    setEditingCategory(categoryName);
    targetForm.setFieldsValue({
      targetAmount: currentTarget || 0,
    });
    setTargetModalOpen(true);
  };

  // 保存分类目标
  const handleSaveTarget = async (values: { targetAmount: number }) => {
    try {
      const response = await fetch('/api/category-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directionId,
          categoryName: editingCategory,
          targetAmount: values.targetAmount,
        }),
      });

      if (response.ok) {
        message.success('目标仓位设置成功');
        setTargetModalOpen(false);
        targetForm.resetFields();
        loadCategoryTargets();
      } else {
        message.error('设置失败');
      }
    } catch {
      message.error('设置失败');
    }
  };

  // 按分类分组
  const groupedFunds = funds.reduce((groups, fund) => {
    const category = fund.category || '未分类';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(fund);
    return groups;
  }, {} as Record<string, Fund[]>);

  const columns = [
    {
      title: '基金代码',
      dataIndex: 'code',
      key: 'code',
      width: 80,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      width: 110,
      ellipsis: true,
      render: (text: string, record: Fund) => (
        <Space style={{ width: '100%' }} size="small">
          <Text
            strong
            style={{
              maxWidth: record.remark ? '150px' : '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'inline-block',
            }}
            title={text}
          >
            {text}
          </Text>
          {record.remark && (
            <Tag color="blue" style={{ fontSize: 12, flexShrink: 0 }}>
              有备注
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '持仓收益率',
      key: 'holdingProfitRate',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.holdingProfitRate && stats?.holdingProfitRate !== 0) {
          return '-';
        }
        const rate = stats.holdingProfitRate;
        const color = rate >= 0 ? '#cf1322' : '#3f8600'; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? '+' : ''}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '累计收益率',
      key: 'totalProfitRate',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfitRate && stats?.totalProfitRate !== 0) {
          return '-';
        }
        const rate = stats.totalProfitRate;
        const color = rate >= 0 ? '#cf1322' : '#3f8600'; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? '+' : ''}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: '累计收益金额',
      key: 'totalProfit',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfit && stats?.totalProfit !== 0) {
          return '-';
        }
        const profit = stats.totalProfit;
        const color = profit >= 0 ? '#cf1322' : '#3f8600'; // 正红负绿
        return (
          <span style={{ color }}>
            {profit >= 0 ? '+' : ''}¥{profit.toLocaleString()}
          </span>
        );
      },
    },
    {
      title: '交易记录',
      key: 'transactions',
      align: 'center' as const,
      width: 100,
      render: (_: unknown, record: Fund) => record._count?.transactions || 0,
    },
    {
      title: '待买入',
      key: 'planned',
      align: 'center' as const,
      width: 90,
      render: (_: unknown, record: Fund) => {
        const count = record._count?.plannedPurchases || 0;
        return count > 0 ? <Tag color="orange">{count}</Tag> : 0;
      },
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: Fund) => (
        <Space>
          <Button
            type="link"
            icon={<LineChartOutlined />}
            onClick={() => router.push(`/funds/${record.id}`)}
            size="small"
            title="详情"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            size="small"
            title="编辑"
          />
          <Popconfirm
            title="确定要删除吗？"
            description="删除后该基金的所有交易记录也会被删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 计算总计
  const totalHoldingCost = Array.from(fundsStats.values()).reduce(
    (sum, stats) => sum + stats.holdingCost,
    0
  );

  // 移动端基金卡片渲染
  const renderMobileFundCard = (fund: Fund) => {
    const stats = fundsStats.get(fund.id);
    return (
      <Card
        key={fund.id}
        size="small"
        style={{ marginBottom: 12 }}
        onClick={() => router.push(`/funds/${fund.id}`)}
      >
        <div style={{ marginBottom: 8 }}>
          <Flex justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Text strong style={{ fontSize: 14 }}>
                {fund.name}
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {fund.code}
              </Text>
            </div>
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(fund);
                }}
              />
              <Popconfirm
                title="确定要删除吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(fund.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          </Flex>
        </div>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div style={{ fontSize: 12, color: '#999' }}>持仓成本</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1890ff' }}>
              ¥{stats?.holdingCost?.toLocaleString() || '-'}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: '#999' }}>持仓份额</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {stats?.holdingShares?.toLocaleString() || '-'}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: '#999' }}>交易记录</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.transactions || 0} 笔
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: '#999' }}>待买入</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.plannedPurchases ? (
                <Tag color="orange">{fund._count.plannedPurchases}</Tag>
              ) : (
                '0'
              )}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: isMobile ? '8px' : '32px',
        background: '#f5f5f5',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* 面包屑 - 移动端简化 */}
        {!isMobile && (
          <Breadcrumb
            items={[
              {
                title: <Link href="/investment-directions">投资方向</Link>,
              },
              {
                title: direction?.name || '加载中...',
              },
            ]}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 顶部信息卡片 */}
        <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Flex
            justify="space-between"
            align={isMobile ? 'flex-start' : 'center'}
            vertical={isMobile}
            gap={isMobile ? 12 : 0}
          >
            <div style={{ width: isMobile ? '100%' : 'auto' }}>
              <Flex align="center" gap="middle" wrap="wrap">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push('/investment-directions')}
                  size={isMobile ? 'small' : 'middle'}
                >
                  返回
                </Button>
                <div>
                  <Title
                    level={isMobile ? 4 : 2}
                    style={{ marginBottom: isMobile ? 4 : 8 }}
                  >
                    <FundOutlined style={{ marginRight: 8 }} />
                    {direction?.name}
                  </Title>
                  {!isMobile && (
                    <Text type="secondary">管理该投资方向下的基金</Text>
                  )}
                </div>
              </Flex>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size={isMobile ? 'small' : 'middle'}
              onClick={() => handleOpenModal()}
              block={isMobile}
            >
              新建基金
            </Button>
          </Flex>
        </Card>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="基金数量"
                value={funds.length}
                suffix="个"
                prefix={<FundOutlined />}
                styles={{ content: { fontSize: isMobile ? 20 : 24 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="预期投入"
                value={direction?.expectedAmount || 0}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{
                  content: { color: '#1890ff', fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="实际投入"
                value={totalHoldingCost}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{
                  content: { color: '#52c41a', fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="投入进度"
                value={
                  direction?.expectedAmount
                    ? (totalHoldingCost / Number(direction.expectedAmount)) *
                      100
                    : 0
                }
                precision={1}
                suffix="%"
                styles={{
                  content: {
                    color:
                      totalHoldingCost >= Number(direction?.expectedAmount || 0)
                        ? '#52c41a'
                        : '#faad14',
                    fontSize: isMobile ? 18 : 24,
                  },
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 盈亏折线图 */}
        <Card
          title={
            <Space>
              <LineChartOutlined />
              <span>盈亏趋势</span>
            </Space>
          }
          style={{ marginBottom: isMobile ? 12 : 24 }}
          extra={
            <Radio.Group
              value={chartDays}
              onChange={(e) => setChartDays(e.target.value)}
              size="small"
            >
              <Radio.Button value={30}>30天</Radio.Button>
              <Radio.Button value={180}>180天</Radio.Button>
              <Radio.Button value={365}>1年</Radio.Button>
            </Radio.Group>
          }
        >
          <Spin spinning={chartLoading}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? 'end' : 'middle'}
                    height={isMobile ? 60 : 40}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    label={{
                      value: '金额 (¥)',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: isMobile ? 10 : 12 },
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    label={{
                      value: '收益率 (%)',
                      angle: 90,
                      position: 'insideRight',
                      style: { fontSize: isMobile ? 10 : 12 },
                    }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string, props: any) => {
                      // name参数是dataKey的值
                      const dataKey = props.dataKey || name;
                      if (dataKey === 'cumulativeProfitRate') {
                        return [`${value.toFixed(2)}%`, '累计收益率'];
                      }
                      if (dataKey === 'dailyProfit') {
                        return [`¥${value.toLocaleString()}`, '每日盈亏'];
                      }
                      if (dataKey === 'cumulativeProfit') {
                        return [`¥${value.toLocaleString()}`, '累计盈亏'];
                      }
                      return [`¥${value.toLocaleString()}`, name];
                    }}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="dailyProfit"
                    stroke="#1890ff"
                    strokeWidth={2}
                    name="每日盈亏"
                    dot={false}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cumulativeProfit"
                    stroke="#52c41a"
                    strokeWidth={2}
                    name="累计盈亏"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativeProfitRate"
                    stroke="#faad14"
                    strokeWidth={2}
                    name="累计收益率"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                暂无数据
              </div>
            )}
          </Spin>
        </Card>

        {/* 汇总收益统计卡片 */}
        {summary && (
          <Card
            title={
              <Space>
                <DollarOutlined />
                <span>收益汇总</span>
              </Space>
            }
            className="mb-6"
            extra={
              <Button
                size="small"
                onClick={() => {
                  loadSummary();
                  message.success('已刷新汇总数据');
                }}
              >
                刷新
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="总投入"
                  value={parseFloat(summary.totalInvested)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="当前市值"
                  value={parseFloat(summary.totalCurrentValue)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="持仓成本"
                  value={parseFloat(summary.totalCost)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="持仓收益"
                  value={parseFloat(summary.holdingProfit)}
                  precision={2}
                  prefix="¥"
                  styles={{
                    content: {
                      fontSize: 18,
                      color:
                        parseFloat(summary.holdingProfit) >= 0
                          ? '#cf1322'
                          : '#3f8600',
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="累计总收益"
                  value={parseFloat(summary.totalProfit)}
                  precision={2}
                  prefix="¥"
                  styles={{
                    content: {
                      fontSize: 20,
                      fontWeight: 'bold',
                      color:
                        parseFloat(summary.totalProfit) >= 0
                          ? '#cf1322'
                          : '#3f8600',
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="累计收益率"
                  value={parseFloat(summary.totalProfitRate)}
                  precision={2}
                  suffix="%"
                  styles={{
                    content: {
                      fontSize: 20,
                      fontWeight: 'bold',
                      color:
                        parseFloat(summary.totalProfitRate) >= 0
                          ? '#cf1322'
                          : '#3f8600',
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="卖出收益"
                  value={parseFloat(summary.totalSellProfit)}
                  precision={2}
                  prefix="¥"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title="现金分红"
                  value={parseFloat(summary.totalDividendCash)}
                  precision={2}
                  prefix="¥"
                />
              </Col>
            </Row>
            <Divider style={{ margin: '16px 0' }} />
            <Text type="secondary">
              包含{summary.fundCount}只基金的完整收益统计，累计收益 = 持仓收益 +
              卖出收益 + 现金分红 + 分红再投资
            </Text>
          </Card>
        )}

        {/* 基金列表 - 按分类分组 */}
        {Object.entries(groupedFunds).map(([category, categoryFunds]) => {
          // 计算该分类下所有基金的持仓成本总和
          const categoryHoldingCost = categoryFunds.reduce((sum, fund) => {
            const stats = fundsStats.get(fund.id);
            return sum + (stats?.holdingCost || 0);
          }, 0);

          // 获取该分类的目标金额
          const categoryTarget = categoryTargets.find(
            (t) => t.categoryName === category
          );
          const targetAmount = categoryTarget?.targetAmount || 0;
          const progress =
            targetAmount > 0
              ? (categoryHoldingCost / Number(targetAmount)) * 100
              : 0;

          return (
            <Card
              key={category}
              title={
                <Flex
                  justify="space-between"
                  align={isMobile ? 'flex-start' : 'center'}
                  vertical={isMobile}
                  gap={isMobile ? 8 : 0}
                >
                  <Space wrap>
                    <Tag color="blue">{category}</Tag>
                    <Text type="secondary">{categoryFunds.length} 只基金</Text>
                  </Space>
                  <Space wrap>
                    {targetAmount > 0 ? (
                      <>
                        <Text
                          type="secondary"
                          style={{ fontSize: isMobile ? 12 : 14 }}
                        >
                          {isMobile ? '当前' : '当前仓位'}: ¥
                          {categoryHoldingCost.toLocaleString()}
                          {!isMobile &&
                            ` / 目标: ¥${Number(
                              targetAmount
                            ).toLocaleString()}`}
                        </Text>
                        <Tag color={progress >= 100 ? 'success' : 'processing'}>
                          {progress.toFixed(1)}%
                        </Tag>
                      </>
                    ) : (
                      <Text type="secondary">
                        当前: ¥{categoryHoldingCost.toLocaleString()}
                      </Text>
                    )}
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        handleOpenTargetModal(category, targetAmount)
                      }
                    >
                      设置目标
                    </Button>
                  </Space>
                </Flex>
              }
              style={{ marginBottom: isMobile ? 12 : 16 }}
            >
              {isMobile ? (
                // 移动端：卡片列表
                <div>
                  {categoryFunds.map((fund) => renderMobileFundCard(fund))}
                </div>
              ) : (
                // 桌面端：表格
                <Table
                  columns={columns}
                  dataSource={categoryFunds}
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 1200 }}
                />
              )}
            </Card>
          );
        })}

        {funds.length === 0 && !loading && (
          <Card>
            <Flex
              vertical
              align="center"
              justify="center"
              style={{ padding: '40px 0' }}
            >
              <FundOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />
              <Text type="secondary" style={{ marginTop: 16 }}>
                还没有添加基金，点击&ldquo;新建基金&rdquo;开始
              </Text>
            </Flex>
          </Card>
        )}

        {/* 新建/编辑弹窗 */}
        <Modal
          title={editingFund ? '编辑基金' : '新建基金'}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 24 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="基金代码"
                  name="code"
                  rules={[{ required: true, message: '请输入基金代码' }]}
                >
                  <Input placeholder="如：000001" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="分类标识"
                  name="category"
                  tooltip="用于分组展示，如：标普、纳指、沪深300等"
                >
                  <Select
                    placeholder="选择或输入分类"
                    size="large"
                    showSearch
                    allowClear
                    options={categoryOptions}
                    onSearch={(value) => {
                      setCategorySearchValue(value);
                    }}
                    onBlur={() => {
                      // 当失去焦点时，如果输入的值不在选项中，自动添加
                      if (
                        categorySearchValue &&
                        categorySearchValue.trim() !== ''
                      ) {
                        const trimmedValue = categorySearchValue.trim();
                        const exists = categoryOptions.some(
                          (opt) => opt.value === trimmedValue
                        );
                        if (!exists) {
                          const newOption = {
                            label: trimmedValue,
                            value: trimmedValue,
                          };
                          setCategoryOptions((prev) => {
                            const newOptions = [...prev, newOption];
                            // 按字母顺序排序
                            return newOptions.sort((a, b) =>
                              a.value.localeCompare(b.value)
                            );
                          });
                          // 自动选中新创建的分类
                          form.setFieldValue('category', trimmedValue);
                        }
                        setCategorySearchValue('');
                      }
                    }}
                    onKeyDown={(e) => {
                      // 当用户按回车时，如果输入的值不在选项中，自动添加并选中
                      if (e.key === 'Enter' && categorySearchValue) {
                        const trimmedValue = categorySearchValue.trim();
                        if (trimmedValue !== '') {
                          const exists = categoryOptions.some(
                            (opt) => opt.value === trimmedValue
                          );
                          if (!exists) {
                            const newOption = {
                              label: trimmedValue,
                              value: trimmedValue,
                            };
                            setCategoryOptions((prev) => {
                              const newOptions = [...prev, newOption];
                              return newOptions.sort((a, b) =>
                                a.value.localeCompare(b.value)
                              );
                            });
                            form.setFieldValue('category', trimmedValue);
                          }
                          setCategorySearchValue('');
                          e.preventDefault();
                        }
                      }
                    }}
                    filterOption={(input, option) => {
                      if (!option?.value) return false;
                      return (option.value as string)
                        .toLowerCase()
                        .includes(input.toLowerCase());
                    }}
                    notFoundContent={
                      categorySearchValue ? (
                        <div style={{ padding: '8px 0', textAlign: 'center' }}>
                          <span style={{ color: '#999', fontSize: 12 }}>
                            按回车创建新分类 "{categorySearchValue}"
                          </span>
                        </div>
                      ) : null
                    }
                    onSelect={(value) => {
                      setCategorySearchValue('');
                    }}
                    onClear={() => {
                      setCategorySearchValue('');
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="基金名称"
              name="name"
              rules={[{ required: true, message: '请输入基金名称' }]}
            >
              <Input placeholder="如：华夏上证50ETF" size="large" />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remark"
              tooltip="记录限购、换购等特殊情况"
            >
              <TextArea
                placeholder="如：该基金QDII限购，改买XXX基金"
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  {editingFund ? '更新' : '创建'}
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>

        {/* 设置分类目标弹窗 */}
        <Modal
          title={`设置"${editingCategory}"分类目标仓位`}
          open={targetModalOpen}
          onCancel={() => {
            setTargetModalOpen(false);
            targetForm.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={targetForm}
            layout="vertical"
            onFinish={handleSaveTarget}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="目标投入金额 (元)"
              name="targetAmount"
              rules={[{ required: true, message: '请输入目标投入金额' }]}
              tooltip="该分类下所有基金的投入总额不应超过此目标"
            >
              <InputNumber
                placeholder="请输入金额"
                size="large"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(value) =>
                  value
                    ? `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                    : ''
                }
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setTargetModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
