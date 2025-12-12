'use client';

import { useState, useEffect } from 'react';
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
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FundOutlined,
  ArrowRightOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

interface InvestmentDirection {
  id: number;
  name: string;
  expectedAmount: number;
  actualAmount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    funds: number;
  };
}

export default function InvestmentDirectionsPage() {
  const [directions, setDirections] = useState<InvestmentDirection[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDirection, setEditingDirection] =
    useState<InvestmentDirection | null>(null);
  const [form] = Form.useForm();

  // 加载投资方向列表
  const loadDirections = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/investment-directions');
      const data = await response.json();
      setDirections(data);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirections();
  }, []);

  // 打开新建/编辑弹窗
  const handleOpenModal = (direction?: InvestmentDirection) => {
    if (direction) {
      setEditingDirection(direction);
      form.setFieldsValue({
        name: direction.name,
        expectedAmount: direction.expectedAmount,
      });
    } else {
      setEditingDirection(null);
      form.resetFields();
    }
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (values: {
    name: string;
    expectedAmount: number;
  }) => {
    try {
      const url = editingDirection
        ? `/api/investment-directions/${editingDirection.id}`
        : '/api/investment-directions';

      const method = editingDirection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(editingDirection ? '更新成功' : '创建成功');
        setModalOpen(false);
        form.resetFields();
        loadDirections();
      } else {
        message.error('操作失败');
      }
    } catch {
      message.error('操作失败');
    }
  };

  // 删除投资方向
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/investment-directions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('删除成功');
        loadDirections();
      } else {
        message.error('删除失败');
      }
    } catch {
      message.error('删除失败');
    }
  };

  // 计算总计
  const totalExpected = directions.reduce(
    (sum, d) => sum + Number(d.expectedAmount),
    0
  );
  const totalActual = directions.reduce(
    (sum, d) => sum + Number(d.actualAmount),
    0
  );

  const columns = [
    {
      title: '投资方向名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: InvestmentDirection) => (
        <Link href={`/investment-directions/${record.id}`}>
          <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}>
            {text}
          </Text>
        </Link>
      ),
    },
    {
      title: (
        <Space>
          预期金额 (元)
          <Tooltip title="您为该投资方向设定的目标投入金额，用于跟踪投资进度">
            <QuestionCircleOutlined
              style={{ color: '#1890ff', cursor: 'help' }}
            />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toLocaleString()}`,
    },
    {
      title: (
        <Space>
          实际投入 (元)
          <Tooltip title="实际投入 = 买入金额 - 卖出金额 + 分红再投资金额。卖出会减少投入（资金收回），分红再投资会增加投入（收益再投入），现金分红不影响投入">
            <QuestionCircleOutlined
              style={{ color: '#1890ff', cursor: 'help' }}
            />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toLocaleString()}`,
    },
    {
      title: (
        <Space>
          投入进度
          <Tooltip title="实际投入 ÷ 预期投入 × 100%，反映投资计划的完成度">
            <QuestionCircleOutlined
              style={{ color: '#1890ff', cursor: 'help' }}
            />
          </Tooltip>
        </Space>
      ),
      key: 'progress',
      align: 'right' as const,
      render: (_: unknown, record: InvestmentDirection) => {
        const progress =
          Number(record.expectedAmount) > 0
            ? (Number(record.actualAmount) / Number(record.expectedAmount)) *
              100
            : 0;
        return `${progress.toFixed(1)}%`;
      },
    },
    {
      title: '基金数量',
      key: 'fundsCount',
      align: 'center' as const,
      render: (_: unknown, record: InvestmentDirection) =>
        record._count?.funds || 0,
    },
    {
      title: '操作',
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, record: InvestmentDirection) => (
        <Space>
          <Link href={`/investment-directions/${record.id}`}>
            <Button type="link" icon={<ArrowRightOutlined />} size="small">
              查看
            </Button>
          </Link>
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
            description="删除后该方向下的所有基金也会被删除"
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-6">
          <Flex justify="space-between" align="center">
            <div>
              <Title level={2} style={{ marginBottom: 8 }}>
                <FundOutlined className="mr-3" />
                投资方向管理
              </Title>
              <Text type="secondary">
                管理您的投资账户，如海外长钱、稳钱账户、长钱账户等
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="large"
              onClick={() => handleOpenModal()}
            >
              新建投资方向
            </Button>
          </Flex>
        </Card>

        {/* 统计卡片 */}
        <Row gutter={16} className="mb-6">
          <Col span={8}>
            <Card>
              <Statistic
                title="投资方向数量"
                value={directions.length}
                suffix="个"
                prefix={<FundOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={
                  <Space>
                    预期总投入
                    <Tooltip title="所有投资方向的目标投入金额总和">
                      <QuestionCircleOutlined
                        style={{ color: '#1890ff', cursor: 'help' }}
                      />
                    </Tooltip>
                  </Space>
                }
                value={totalExpected}
                precision={2}
                prefix="¥"
                styles={{ content: { color: '#1890ff' } }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title={
                  <Space>
                    实际总投入
                    <Tooltip title="所有投资方向的买入交易金额总和，不包括卖出和分红">
                      <QuestionCircleOutlined
                        style={{ color: '#1890ff', cursor: 'help' }}
                      />
                    </Tooltip>
                  </Space>
                }
                value={totalActual}
                precision={2}
                prefix="¥"
                styles={{ content: { color: '#52c41a' } }}
              />
            </Card>
          </Col>
        </Row>

        {/* 投资方向列表 */}
        <Card>
          <Table
            columns={columns}
            dataSource={directions}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </Card>

        {/* 新建/编辑弹窗 */}
        <Modal
          title={editingDirection ? '编辑投资方向' : '新建投资方向'}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="投资方向名称"
              name="name"
              rules={[{ required: true, message: '请输入投资方向名称' }]}
            >
              <Input
                placeholder="如：海外长钱、稳钱账户、长钱账户"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="预期投入金额 (元)"
              name="expectedAmount"
              rules={[{ required: true, message: '请输入预期投入金额' }]}
            >
              <InputNumber
                placeholder="请输入金额"
                size="large"
                style={{ width: '100%' }}
                min={0}
                precision={2}
                formatter={(value) =>
                  `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                }
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  {editingDirection ? '更新' : '创建'}
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
