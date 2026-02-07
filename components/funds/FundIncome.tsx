import { Card, Typography, Row, Col, Statistic } from "antd";
import { RiseOutlined, FallOutlined } from "@ant-design/icons";
import { FundStats } from "@/types/fund";

const { Text } = Typography;

interface FundIncomeProps {
  stats: FundStats | null;
  isMobile: boolean;
  currentPrice: number;
}

export default function FundIncome({
  stats,
  isMobile,
  currentPrice,
}: FundIncomeProps) {
  if (currentPrice <= 0) return null;

  return (
    <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
          收益明细
        </Text>
      </div>
      <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]}>
        <Col xs={12} sm={12} md={6}>
          <Statistic
            title={<span style={{ fontSize: isMobile ? 12 : 14 }}>卖出收益</span>}
            value={stats?.totalSellProfit || 0}
            precision={isMobile ? 0 : 2}
            prefix={
              <span>
                {(stats?.totalSellProfit || 0) >= 0 ? (
                  <RiseOutlined style={{ color: "#cf1322", marginRight: 4 }} />
                ) : (
                  <FallOutlined style={{ color: "#3f8600", marginRight: 4 }} />
                )}
                <span style={{ color: "inherit" }}>¥</span>
              </span>
            }
            styles={{
              content: {
                color:
                  (stats?.totalSellProfit || 0) >= 0 ? "#cf1322" : "#3f8600",
                fontSize: isMobile ? 16 : 20,
              },
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Statistic
            title={<span style={{ fontSize: isMobile ? 12 : 14 }}>现金分红</span>}
            value={stats?.totalDividendCash || 0}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{
              content: { color: "#52c41a", fontSize: isMobile ? 16 : 20 },
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Statistic
            title={
              <span style={{ fontSize: isMobile ? 12 : 14 }}>再投资分红</span>
            }
            value={stats?.totalDividendReinvest || 0}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{
              content: { color: "#1890ff", fontSize: isMobile ? 16 : 20 },
            }}
          />
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Statistic
            title={<span style={{ fontSize: isMobile ? 12 : 14 }}>交易笔数</span>}
            value={stats?.transactionCount || 0}
            suffix="笔"
            styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
          />
        </Col>
      </Row>
    </Card>
  );
}
