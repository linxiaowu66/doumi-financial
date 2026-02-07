import {
  Card,
  Space,
  Typography,
  InputNumber,
  Button,
  Row,
  Col,
  Statistic,
  Flex,
} from "antd";
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Fund, FundStats, Transaction } from "@/types/fund";

const { Text } = Typography;

interface FundStatsCardProps {
  fund: Fund | null;
  stats: FundStats | null;
  transactions: Transaction[];
  currentPrice: number;
  isMobile: boolean;
  fetchingPrice: boolean;
  onPriceChange: (value: number) => void;
  onFetchPrice: () => void;
  onRefresh: () => void;
  normalizeZero: (value: number | undefined | null) => number;
}

export default function FundStatsCard({
  fund,
  stats,
  transactions,
  currentPrice,
  isMobile,
  fetchingPrice,
  onPriceChange,
  onFetchPrice,
  onRefresh,
  normalizeZero,
}: FundStatsCardProps) {
  return (
    <Card
      title={<span style={{ fontSize: isMobile ? 14 : 16 }}>持仓统计</span>}
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={
        isMobile ? null : (
          <Space direction="vertical" size="small" align="end">
            <Space>
              <Text>当前净值：</Text>
              <InputNumber
                value={currentPrice}
                onChange={(value) => onPriceChange(value || 0)}
                precision={4}
                min={0}
                step={0.0001}
                style={{ width: 120 }}
                placeholder="净值"
              />
              <Button
                size="small"
                onClick={onFetchPrice}
                loading={fetchingPrice}
                disabled={!fund?.code}
              >
                获取最新
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={onRefresh}
                disabled={!currentPrice}
              >
                刷新
              </Button>
            </Space>
            {fund?.netWorthDate && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                净值日期：{fund.netWorthDate}
                {fund.netWorthUpdateAt &&
                  ` (更新于 ${dayjs(fund.netWorthUpdateAt).format(
                    "MM-DD HH:mm"
                  )})`}
              </Text>
            )}
          </Space>
        )
      }
    >
      {/* 移动端：净值控制区域 */}
      {isMobile && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px",
            background: "#f5f5f5",
            borderRadius: 8,
          }}
        >
          <Space direction="vertical" size="small" style={{ width: "100%" }}>
            <Flex justify="space-between" align="center">
              <Text style={{ fontSize: 12 }}>当前净值：</Text>
              <InputNumber
                value={currentPrice}
                onChange={(value) => onPriceChange(value || 0)}
                precision={4}
                min={0}
                step={0.0001}
                style={{ width: 100 }}
                size="small"
                placeholder="净值"
              />
            </Flex>
            <Flex gap={8}>
              <Button
                size="small"
                onClick={onFetchPrice}
                loading={fetchingPrice}
                disabled={!fund?.code}
                block
              >
                获取最新
              </Button>
              <Button
                type="primary"
                size="small"
                onClick={onRefresh}
                disabled={!currentPrice}
                block
              >
                刷新
              </Button>
            </Flex>
            {fund?.netWorthDate && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                净值日期：{fund.netWorthDate}
              </Text>
            )}
          </Space>
        </div>
      )}

      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]}>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓份额</span>
            }
            value={normalizeZero(stats?.holdingShares)}
            precision={2}
            prefix={<DollarOutlined />}
            styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
          />
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓成本价</span>
            }
            value={normalizeZero(stats?.avgCostPrice)}
            precision={isMobile ? 2 : 4}
            prefix="¥"
            styles={{
              content: { color: "#1890ff", fontSize: isMobile ? 16 : 20 },
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓成本</span>
            }
            value={normalizeZero(stats?.holdingCost)}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
          />
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓市值</span>
            }
            value={normalizeZero(stats?.holdingValue)}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{
              content: { color: "#722ed1", fontSize: isMobile ? 16 : 20 },
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓收益</span>
            }
            value={normalizeZero(stats?.holdingProfit)}
            precision={isMobile ? 0 : 2}
            prefix={
              <span>
                {normalizeZero(stats?.holdingProfit) >= 0 ? (
                  <RiseOutlined style={{ color: "#cf1322", marginRight: 4 }} />
                ) : (
                  <FallOutlined style={{ color: "#3f8600", marginRight: 4 }} />
                )}
                <span style={{ color: "inherit" }}>¥</span>
              </span>
            }
            valueStyle={{
              color:
                normalizeZero(stats?.holdingProfit) >= 0
                  ? "#cf1322"
                  : "#3f8600",
              fontSize: isMobile ? 16 : 20,
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={8}>
          <Statistic
            title={<span style={{ fontSize: isMobile ? 12 : 14 }}>收益率</span>}
            value={stats?.holdingProfitRate || 0}
            precision={2}
            prefix={
              (stats?.holdingProfitRate || 0) >= 0 ? (
                <RiseOutlined style={{ color: "#cf1322" }} />
              ) : (
                <FallOutlined style={{ color: "#3f8600" }} />
              )
            }
            suffix="%"
            valueStyle={{
              color:
                (stats?.holdingProfitRate || 0) >= 0 ? "#cf1322" : "#3f8600",
              fontSize: isMobile ? 16 : 20,
            }}
          />
        </Col>
        {(() => {
          // 计算最近一笔买入交易
          const latestBuyTransaction = transactions
            .filter((t) => t.type === "BUY")
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];

          if (!latestBuyTransaction || !currentPrice || currentPrice <= 0) {
            return null;
          }

          const latestBuyPrice = Number(latestBuyTransaction.price);
          const priceDiff = currentPrice - latestBuyPrice;
          const priceDiffPercent =
            latestBuyPrice > 0 ? (priceDiff / latestBuyPrice) * 100 : 0;

          return (
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>
                    最近买入净值
                  </span>
                }
                value={latestBuyPrice}
                precision={4}
                prefix="¥"
                styles={{
                  content: {
                    color: "#722ed1",
                    fontSize: isMobile ? 16 : 20,
                  },
                }}
                suffix={
                  <div style={{ fontSize: isMobile ? 11 : 12, marginTop: 4 }}>
                    <span
                      style={{
                        color: priceDiff >= 0 ? "#cf1322" : "#3f8600",
                      }}
                    >
                      {priceDiff >= 0 ? "+" : ""}
                      {priceDiff.toFixed(4)} ({priceDiff >= 0 ? "+" : ""}
                      {priceDiffPercent.toFixed(2)}%)
                    </span>
                  </div>
                }
              />
            </Col>
          );
        })()}
        {!isMobile && (
          <>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="累计收益"
                value={stats?.totalProfit || 0}
                precision={2}
                prefix={
                  (stats?.totalProfit || 0) >= 0 ? (
                    <RiseOutlined style={{ color: "#cf1322" }} />
                  ) : (
                    <FallOutlined style={{ color: "#3f8600" }} />
                  )
                }
                valueStyle={{
                  color: (stats?.totalProfit || 0) >= 0 ? "#cf1322" : "#3f8600",
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="累计收益率"
                value={stats?.totalProfitRate || 0}
                precision={2}
                prefix={
                  (stats?.totalProfitRate || 0) >= 0 ? (
                    <RiseOutlined style={{ color: "#cf1322" }} />
                  ) : (
                    <FallOutlined style={{ color: "#3f8600" }} />
                  )
                }
                suffix="%"
                valueStyle={{
                  color:
                    (stats?.totalProfitRate || 0) >= 0 ? "#cf1322" : "#3f8600",
                }}
              />
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Statistic
                title="交易笔数"
                value={stats?.transactionCount || 0}
              />
            </Col>
          </>
        )}
      </Row>
    </Card>
  );
}
