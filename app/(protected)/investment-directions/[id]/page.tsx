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

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
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
  const [isMobile, setIsMobile] = useState(false);

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

      // 加载每个基金的统计信息
      const statsMap = new Map<number, FundStats>();
      await Promise.all(
        data.map(async (fund: Fund) => {
          try {
            const statsRes = await fetch(`/api/funds/${fund.id}/stats`);
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

  useEffect(() => {
    loadDirection();
    loadFunds();
    loadCategoryTargets();
    loadSummary();
  }, [directionId, loadDirection, loadFunds, loadCategoryTargets, loadSummary]);

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
      width: 120,
    },
    {
      title: '基金名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Fund) => (
        <Space>
          <Text strong>{text}</Text>
          {record.remark && (
            <Tag color="blue" style={{ fontSize: 12 }}>
              有备注
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '持仓成本价',
      key: 'avgCostPrice',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        return stats?.avgCostPrice ? `¥${stats.avgCostPrice.toFixed(4)}` : '-';
      },
    },
    {
      title: '持仓金额',
      key: 'holdingCost',
      align: 'right' as const,
      width: 130,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        return stats?.holdingCost
          ? `¥${stats.holdingCost.toLocaleString()}`
          : '-';
      },
    },
    {
      title: '持仓份额',
      key: 'holdingShares',
      align: 'right' as const,
      width: 120,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        return stats?.holdingShares
          ? stats.holdingShares.toLocaleString()
          : '-';
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
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: Fund) => (
        <Space>
          <Button
            type="link"
            icon={<LineChartOutlined />}
            onClick={() => router.push(`/funds/${record.id}`)}
            size="small"
          >
            详情
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            description="删除后该基金的所有交易记录也会被删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
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
                  <Input placeholder="如：标普" size="large" />
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
