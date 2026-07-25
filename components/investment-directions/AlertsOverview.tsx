import { Card, Space, Alert, Typography, Tag, Row, Col } from 'antd';
import {
  WarningOutlined,
  FallOutlined,
  RiseOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { FundAlert } from '@/types/investment-direction';

const { Text } = Typography;

const alertTagStyle = {
  cursor: 'pointer',
  display: 'inline-block',
  maxWidth: '100%',
  whiteSpace: 'normal' as const,
  overflowWrap: 'anywhere' as const,
  fontSize: 12,
  lineHeight: '20px',
};

const alertTitleStyle = { fontSize: 15 };

const highlightAlertReason = (reason: string) => {
  const important = /(买入|卖出|回补|补仓|止盈|上涨|下跌|回撤|仓位超标|\d+(?:\.\d+)?%)/g;
  const isImportant = /^(?:买入|卖出|回补|补仓|止盈|上涨|下跌|回撤|仓位超标|\d+(?:\.\d+)?%)$/;
  return reason.split(important).map((part, index) =>
    isImportant.test(part) ? <strong key={index}>{part}</strong> : part,
  );
};

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
    take_profit: alerts.filter((a) => a.alertType === 'take_profit'),
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

  const dropAfterSell = alertsByType.price_drop.filter((alert) =>
    alert.alertReason.includes("最近卖出"),
  );
  const dropAfterBuy = alertsByType.price_drop.filter((alert) =>
    alert.alertReason.includes("最近买入"),
  );
  const riseAfterSell = alertsByType.price_rise.filter((alert) =>
    alert.alertReason.includes("最近卖出"),
  );
  const riseAfterBuy = alertsByType.price_rise.filter((alert) =>
    alert.alertReason.includes("最近买入"),
  );

  const renderAlertTags = (items: FundAlert[], color: string) => (
    <Space wrap style={{ width: '100%' }}>
      {items.map((alert) => (
        <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
          <Tag color={color} style={alertTagStyle}>
            {alert.fundName}
            <br />
            {highlightAlertReason(alert.alertReason)}
          </Tag>
        </Link>
      ))}
    </Space>
  );

  return (
    <Card className="mb-6" title={<><WarningOutlined className="mr-2" />资产预警概要</>}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 待确认交易预警 */}
        {alertsByType.pending_transaction.length > 0 && (
          <Alert
            type="info"
            icon={<SyncOutlined spin />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={alertTitleStyle}>待确认交易 ({alertsByType.pending_transaction.length})</Text>
                <Space wrap>
                  {alertsByType.pending_transaction.map((alert) => (
                    <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
                      <Tag color="processing" style={alertTagStyle}>
                        {alert.fundName}
                        <br />
                        {highlightAlertReason(alert.alertReason)}
                      </Tag>
                    </Link>
                  ))}
                </Space>
              </Space>
            }
          />
        )}

        {alertsByType.price_drop.length > 0 && (
          <Alert
            type="warning"
            icon={<FallOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text strong style={alertTitleStyle}>价格下跌预警 ({alertsByType.price_drop.length})</Text>
                <Row gutter={[16, 12]}>
                  {dropAfterSell.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 13 }}>卖出后网格回补 ({dropAfterSell.length})</Text>
                        {renderAlertTags(dropAfterSell, "orange")}
                      </Space>
                    </Col>
                  )}
                  {dropAfterBuy.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 13 }}>买入后补仓摊平 ({dropAfterBuy.length})</Text>
                        {renderAlertTags(dropAfterBuy, "gold")}
                      </Space>
                    </Col>
                  )}
                </Row>
              </Space>
            }
          />
        )}

        {alertsByType.price_rise.length > 0 && (
          <Alert
            type="success"
            icon={<RiseOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <Text strong style={alertTitleStyle}>价格上涨提醒 ({alertsByType.price_rise.length})</Text>
                <Row gutter={[16, 12]}>
                  {riseAfterSell.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 13 }}>卖出后上涨提醒 ({riseAfterSell.length})</Text>
                        {renderAlertTags(riseAfterSell, "green")}
                      </Space>
                    </Col>
                  )}
                  {riseAfterBuy.length > 0 && (
                    <Col xs={24} lg={12}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 13 }}>买入后上涨提醒 ({riseAfterBuy.length})</Text>
                        {renderAlertTags(riseAfterBuy, "green")}
                      </Space>
                    </Col>
                  )}
                </Row>
              </Space>
            }
          />
        )}

        {alertsByType.take_profit.length > 0 && (
          <Alert
            type="warning"
            icon={<DollarOutlined />}
            message={
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text strong style={alertTitleStyle}>止盈策略提醒 ({alertsByType.take_profit.length})</Text>
                <Space wrap>
                  {alertsByType.take_profit.map((alert) => (
                    <Link key={alert.fundId} href={`/funds/${alert.fundId}`}>
                      <Tag color="gold" style={alertTagStyle}>
                        {alert.fundName}
                        <br />
                        {highlightAlertReason(alert.alertReason)}
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
                <Text strong style={alertTitleStyle}>分类长期未买入 ({uniqueCategoryOverdue.length})</Text>
                <Space wrap>
                  {uniqueCategoryOverdue.map((alert) => (
                    <Link
                      key={`${alert.directionId}-${alert.category}`}
                      href={`/investment-directions/${alert.directionId}#category-${encodeURIComponent(alert.category || '')}`}
                    >
                      <Tag color="blue" style={alertTagStyle}>
                        {alert.category}
                        <br />
                        {highlightAlertReason(alert.alertReason)}
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
                <Text strong style={alertTitleStyle}>分类仓位超标 ({uniqueCategoryOverweight.length})</Text>
                <Space wrap>
                  {uniqueCategoryOverweight.map((alert) => (
                    <Link
                      key={`${alert.directionId}-${alert.category}`}
                      href={`/investment-directions/${alert.directionId}#category-${encodeURIComponent(alert.category || '')}`}
                    >
                      <Tag color="red" style={alertTagStyle}>
                        {alert.category}
                        <br />
                        {highlightAlertReason(alert.alertReason)}
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
