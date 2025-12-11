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
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  DollarOutlined,
  FundOutlined,
  ArrowRightOutlined,
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      title: '预期金额 (元)',
      dataIndex: 'expectedAmount',
      key: 'expectedAmount',
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toLocaleString()}`,
    },
    {
      title: '实际投入 (元)',
      dataIndex: 'actualAmount',
      key: 'actualAmount',
      align: 'right' as const,
      render: (amount: number) => `¥${Number(amount).toLocaleString()}`,
    },
    {
      title: '投入进度',
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
                title="预期总投入"
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
                title="实际总投入"
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
                parser={(value) =>
                  value?.replace(/¥\s?|(,*)/g, '') as unknown as number
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
