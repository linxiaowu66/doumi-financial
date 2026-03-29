import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Tooltip,
  Badge,
  Popconfirm,
  Flex,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ArrowRightOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import dayjs from 'dayjs';
import { InvestmentDirection } from '@/types/investment-direction';

const { Text } = Typography;

interface DirectionListProps {
  directions: InvestmentDirection[];
  loading: boolean;
  isMobile?: boolean;
  onEdit: (direction: InvestmentDirection) => void;
  onDelete: (id: number) => void;
}

export default function DirectionList({
  directions,
  loading,
  isMobile = false,
  onEdit,
  onDelete,
}: DirectionListProps) {
  const columns = [
    {
      title: '投资方向名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: InvestmentDirection) => (
        <Space>
          <Link href={`/investment-directions/${record.id}`}>
            <Text strong style={{ color: '#1890ff', cursor: 'pointer' }}>
              {text}
            </Text>
          </Link>
          {record.pendingCount && record.pendingCount > 0 ? (
            <Tooltip title={`有 ${record.pendingCount} 笔待确认交易`}>
              <Badge count={record.pendingCount} size="small" offset={[5, 0]}>
                <ClockCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />
              </Badge>
            </Tooltip>
          ) : null}
        </Space>
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
      title: '数量',
      key: 'fundsCount',
      align: 'center' as const,
      render: (_: unknown, record: InvestmentDirection) =>
        record._count?.funds || 0,
    },
    {
      title: '最新操作时间',
      key: 'latestTransaction',
      align: 'center' as const,
      width: 180,
      render: (_: unknown, record: InvestmentDirection) => {
        if (!record.latestTransaction) {
          return <Text type="secondary">暂无操作</Text>;
        }

        const typeMap: Record<string, string> = {
          BUY: '买入',
          SELL: '卖出',
          DIVIDEND: '分红',
        };

        const transactionType = typeMap[record.latestTransaction.type] || record.latestTransaction.type;
        const transactionDate = dayjs(record.latestTransaction.date).format('YYYY-MM-DD');

        return (
          <Tooltip
            title={`${record.latestTransaction.fundName} - ${transactionType}`}
            placement="top"
          >
            <Text type="secondary" style={{ cursor: 'help' }}>
              {transactionDate}
            </Text>
          </Tooltip>
        );
      },
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
            onClick={() => onEdit(record)}
            size="small"
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
            description="删除后该方向下的所有资产也会被删除"
            onConfirm={() => onDelete(record.id)}
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

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {directions.map((record) => {
          const progress =
            Number(record.expectedAmount) > 0
              ? (Number(record.actualAmount) / Number(record.expectedAmount)) * 100
              : 0;

          return (
            <Card key={record.id} size="small">
              <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                <Link href={`/investment-directions/${record.id}`}>
                  <Text strong style={{ fontSize: 16, color: '#1890ff' }}>{record.name}</Text>
                </Link>
                {record.pendingCount && record.pendingCount > 0 && (
                  <Badge count={record.pendingCount} size="small">
                    <ClockCircleOutlined style={{ color: '#faad14' }} />
                  </Badge>
                )}
              </Flex>
              
              <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                <Col span={12}>
                  <Statistic
                    title="预期金额"
                    value={record.expectedAmount}
                    precision={0}
                    prefix="¥"
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="实际投入"
                    value={record.actualAmount}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="投入进度"
                    value={progress}
                    precision={1}
                    suffix="%"
                    valueStyle={{ fontSize: 14, color: progress >= 100 ? '#52c41a' : '#faad14' }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="资产数量"
                    value={record._count?.funds || 0}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Col>
              </Row>

              <Flex justify="space-between" align="center" style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {record.latestTransaction 
                    ? `最近: ${dayjs(record.latestTransaction.date).format('MM-DD')}`
                    : '暂无操作'}
                </Text>
                <Space>
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<EditOutlined />}
                    onClick={() => onEdit(record)}
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确定删除吗？"
                    onConfirm={() => onDelete(record.id)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </Flex>
            </Card>
          );
        })}
      </div>
    );
  }

  return (
    <Card>
      <Table
        columns={columns}
        dataSource={directions}
        loading={loading}
        rowKey="id"
        pagination={false}
      />
    </Card>
  );
}
