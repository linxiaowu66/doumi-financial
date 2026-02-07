import { Card, Space, Alert, Typography, Tag } from 'antd';
import {
  WarningOutlined,
  FallOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { FundAlert } from '@/types/investment-direction';

const { Text } = Typography;

interface AlertsOverviewProps {
  alerts: FundAlert[];
  loading: boolean;
}

export default function AlertsOverview({ alerts, loading }: AlertsOverviewProps) {
  if (loading || alerts.length === 0) return null;

  // 按类型分组预警
  const alertsByType = {
    price_drop: alerts.filter((a) => a.alertType === 'price_drop'),
    price_rise: alerts.filter((a) => a.alertType === 'price_rise'),
    category_overdue: alerts.filter((a) => a.alertType === 'category_overdue'),
    category_overweight: alerts.filter((a) => a.alertType === 'category_overweight'),
    pending_transaction: alerts.filter((a) => a.alertType === 'pending_transaction'),
  };

  // 去重分类预警（一个分类只显示一次）
  const uniqueCategoryOverdue = Array.from(
    new Map(
      alertsByType.category_overdue.map((alert) => [
        `${alert.directionId}-${alert.category}`,
        alert,
      ])
    ).values()
  );

  const uniqueCategoryOverweight = Array.from(
    new Map(
      alertsByType.category_overweight.map((alert) => [
        `${alert.directionId}-${alert.category}`,
        alert,
      ])
    ).values()
  );

  return (
    <Card className="mb-6" title={<><WarningOutlined className="mr-2" />基金预警概要</>}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 待确认交易预警 */}
        {alertsByType.pending_transaction.length > 0 && (
          <Alert
            type="info"
            icon={<SyncOutlined spin />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>待确认交易 ({alertsByType.pending_transaction.length})</Text>
                <Space wrap>
                  {alertsByType.pending_transaction.map((alert) => (
                    <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
                      <Tag color="processing" style={{ cursor: 'pointer' }}>
                        {alert.fundName} ({alert.directionName})
                        <br />
                        {alert.alertReason}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}

        {/* 价格下跌预警 */}
        {alertsByType.price_drop.length > 0 && (
          <Alert
            type="warning"
            icon={<FallOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>价格下跌预警 ({alertsByType.price_drop.length})</Text>
                <Space wrap>
                  {alertsByType.price_drop.map((alert) => (
                    <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
                      <Tag color="orange" style={{ cursor: 'pointer' }}>
                        {alert.fundName} ({alert.directionName})
                        <br />
                        {alert.alertReason}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}

        {/* 价格上涨预警 */}
        {alertsByType.price_rise.length > 0 && (
          <Alert
            type="success"
            icon={<RiseOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>价格上涨提醒 ({alertsByType.price_rise.length})</Text>
                <Space wrap>
                  {alertsByType.price_rise.map((alert) => (
                    <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
                      <Tag color="green" style={{ cursor: 'pointer' }}>
                        {alert.fundName} ({alert.directionName})
                        <br />
                        {alert.alertReason}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}

        {/* 分类超期预警 */}
        {uniqueCategoryOverdue.length > 0 && (
          <Alert
            type="info"
            icon={<ClockCircleOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>分类长期未买入 ({uniqueCategoryOverdue.length})</Text>
                <Space wrap>
                  {uniqueCategoryOverdue.map((alert) => (
                    <Link
                      key={`${alert.directionId}-${alert.category}`}
                      href={`/investment-directions/${alert.directionId}#category-${encodeURIComponent(alert.category || '')}`}
                    >
                      <Tag color="blue" style={{ cursor: 'pointer' }}>
                        {alert.directionName} - {alert.category}
                        <br />
                        {alert.alertReason}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}

        {/* 分类仓位超标预警 */}
        {uniqueCategoryOverweight.length > 0 && (
          <Alert
            type="error"
            icon={<WarningOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong>分类仓位超标 ({uniqueCategoryOverweight.length})</Text>
                <Space wrap>
                  {uniqueCategoryOverweight.map((alert) => (
                    <Link
                      key={`${alert.directionId}-${alert.category}`}
                      href={`/investment-directions/${alert.directionId}#category-${encodeURIComponent(alert.category || '')}`}
                    >
                      <Tag color="red" style={{ cursor: 'pointer' }}>
                        {alert.directionName} - {alert.category}
                        <br />
                        {alert.alertReason}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}
      </Space>
    </Card>
  );
}
