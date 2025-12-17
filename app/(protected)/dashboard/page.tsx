'use client';

import {
  Card,
  Row,
  Col,
  Statistic,
  Empty,
  Button,
  Space,
  App,
  Modal,
} from 'antd';
import {
  FundOutlined,
  DollarOutlined,
  RiseOutlined,
  LineChartOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface DirectionSummary {
  id: number;
  name: string;
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
  lastTradeDate: string; // 最近交易日日期
  totalCurrentValue: string; // 当前总市值
  totalCost: string; // 持仓总成本
  totalInvested: string; // 历史总投入
  directionCount: number; // 投资方向数量
}

interface UpdateResult {
  fundName: string;
  code: string;
  success: boolean;
  netWorth?: string;
  netWorthDate?: string;
  error?: string;
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

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      loadDirections();
      loadSummary();
    }
  }, [status, router]);

  const loadDirections = async () => {
    try {
      const response = await fetch('/api/investment-directions');
      const data = await response.json();
      setDirections(data);
    } catch (error) {
      console.error('加载投资方向失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await fetch('/api/dashboard/summary');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('加载汇总数据失败:', error);
    }
  };

  // 批量更新净值
  const handleBatchUpdateNetWorth = async () => {
    const totalFunds = directions.reduce(
      (sum, d) => sum + (d._count?.funds || 0),
      0
    );

    if (totalFunds === 0) {
      message.warning('暂无基金需要更新');
      return;
    }

    Modal.confirm({
      title: '批量更新净值',
      content: `即将更新 ${totalFunds} 只基金的净值，每只基金间隔 0.5 秒请求，预计需要 ${Math.ceil(
        (totalFunds * 0.5) / 60
      )} 分钟。是否继续？`,
      okText: '开始更新',
      cancelText: '取消',
      onOk: () => {
        return new Promise(async (resolve, reject) => {
          setUpdating(true);
          setUpdateResults([]);

          try {
            const response = await fetch('/api/funds/batch-update-networth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
              message.error(data.error || '更新失败');
            }
          } catch {
            message.error('更新失败，请重试');
          } finally {
            setUpdating(false);
            resolve(true);
          }
        });
      },
    });
  };

  if (status === 'loading' || loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>加载中...</div>;
  }

  return (
    <App>
      <div>
        {/* 页面标题 */}
        <div style={{ marginBottom: isMobile ? 16 : 24 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              gap: isMobile ? 12 : 0,
              marginBottom: 8,
            }}
          >
            <h1 style={{ fontSize: isMobile ? 20 : 24, margin: 0 }}>
              <DollarOutlined style={{ marginRight: 8 }} />
              投资概览
            </h1>
            <Button
              type="primary"
              icon={<SyncOutlined spin={updating} />}
              onClick={handleBatchUpdateNetWorth}
              loading={updating}
              block={isMobile}
            >
              {updating ? '更新中...' : '更新所有净值'}
            </Button>
          </div>
          {!isMobile && (
            <p style={{ color: '#666', margin: 0 }}>
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
                  content: { color: '#1890ff', fontSize: isMobile ? 20 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <Card>
              <Statistic
                title="管理基金"
                value={directions.reduce(
                  (sum, d) => sum + (d._count?.funds || 0),
                  0
                )}
                suffix="只"
                prefix={<LineChartOutlined />}
                styles={{
                  content: { color: '#52c41a', fontSize: isMobile ? 20 : 24 },
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
                  0
                )}
                precision={2}
                prefix="¥"
                styles={{
                  content: { color: '#faad14', fontSize: isMobile ? 18 : 24 },
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
                  0
                )}
                precision={2}
                prefix="¥"
                styles={{
                  content: { color: '#722ed1', fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 盈亏统计卡片 */}
        {summary && (
          <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 16 : 24 }}>
            <Col xs={12} sm={12} lg={12}>
              <Card>
                <Statistic
                  title={
                    summary.lastTradeDate
                      ? `${summary.lastTradeDate.slice(5)} 盈亏`
                      : '最近盈亏'
                  }
                  value={parseFloat(summary.todayProfit)}
                  precision={2}
                  prefix={
                    parseFloat(summary.todayProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      '¥'
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.todayProfit) >= 0
                        ? '#cf1322'
                        : '#3f8600',
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 'bold',
                  }}
                  suffix={
                    <div
                      style={{
                        fontSize: isMobile ? 14 : 16,
                        fontWeight: 'normal',
                        marginLeft: 8,
                      }}
                    >
                      ({parseFloat(summary.todayProfitRate) >= 0 ? '+' : ''}
                      {parseFloat(summary.todayProfitRate).toFixed(2)}%)
                    </div>
                  }
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} lg={12}>
              <Card>
                <Statistic
                  title="累计盈亏"
                  value={parseFloat(summary.totalProfit)}
                  precision={2}
                  prefix={
                    parseFloat(summary.totalProfit) >= 0 ? (
                      <RiseOutlined />
                    ) : (
                      '¥'
                    )
                  }
                  valueStyle={{
                    color:
                      parseFloat(summary.totalProfit) >= 0
                        ? '#cf1322'
                        : '#3f8600',
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 'bold',
                  }}
                  suffix={
                    <div
                      style={{
                        fontSize: isMobile ? 14 : 16,
                        fontWeight: 'normal',
                        marginLeft: 8,
                      }}
                    >
                      ({parseFloat(summary.totalProfitRate) >= 0 ? '+' : ''}
                      {parseFloat(summary.totalProfitRate).toFixed(2)}%)
                    </div>
                  }
                />
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

                return (
                  <Col xs={24} sm={12} lg={8} key={direction.id}>
                    <Link href={`/investment-directions/${direction.id}`}>
                      <Card
                        hoverable
                        style={{ height: '100%' }}
                        styles={{ body: { padding: 20 } }}
                      >
                        <Space
                          orientation="vertical"
                          style={{ width: '100%' }}
                          size="middle"
                        >
                          <div>
                            <h3 style={{ margin: 0, fontSize: 18 }}>
                              <FundOutlined style={{ marginRight: 8 }} />
                              {direction.name}
                            </h3>
                          </div>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Statistic
                                title="预期投入"
                                value={parseFloat(direction.expectedAmount)}
                                precision={0}
                                prefix="¥"
                                styles={{ content: { fontSize: 16 } }}
                              />
                            </Col>
                            <Col span={12}>
                              <Statistic
                                title="实际投入"
                                value={parseFloat(direction.actualAmount)}
                                precision={0}
                                prefix="¥"
                                styles={{ content: { fontSize: 16 } }}
                              />
                            </Col>
                          </Row>
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                              }}
                            >
                              <span style={{ fontSize: 12, color: '#666' }}>
                                投入进度
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  color:
                                    progress >= 100 ? '#52c41a' : '#faad14',
                                }}
                              >
                                {progress.toFixed(1)}%
                              </span>
                            </div>
                            <div
                              style={{
                                height: 8,
                                backgroundColor: '#f0f0f0',
                                borderRadius: 4,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(progress, 100)}%`,
                                  backgroundColor:
                                    progress >= 100 ? '#52c41a' : '#1890ff',
                                  transition: 'width 0.3s',
                                }}
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: '#999',
                              textAlign: 'center',
                            }}
                          >
                            {direction._count?.funds || 0} 只基金
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
              <Card type="inner" title="2. 添加基金">
                <p>在投资方向下添加具体的基金产品</p>
                <Button type="link" icon={<FundOutlined />} disabled>
                  需先创建投资方向
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card type="inner" title="3. 记录交易">
                <p>记录买入、卖出、分红等交易，系统自动计算收益</p>
                <Button type="link" icon={<LineChartOutlined />} disabled>
                  需先添加基金
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
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
        width={isMobile ? '90%' : 600}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {updateResults.map((result, index) => (
            <div
              key={index}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: isMobile ? 12 : 14 }}>
                  {result.fundName} ({result.code})
                </span>
                <span
                  style={{
                    color: result.success ? '#52c41a' : '#ff4d4f',
                    fontSize: isMobile ? 12 : 14,
                  }}
                >
                  {result.success ? '✓ 成功' : '✗ 失败'}
                </span>
              </div>
              {result.success && result.netWorth && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  净值: ¥{result.netWorth} ({result.netWorthDate})
                </div>
              )}
              {!result.success && result.error && (
                <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
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
