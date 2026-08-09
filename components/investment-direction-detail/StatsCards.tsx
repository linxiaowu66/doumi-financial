import { Card, Statistic, Tooltip, Space, Row, Col } from "antd";
import { FundOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { InvestmentDirection } from "@/types/investment-direction-detail";
import { useInvestmentConfig } from "@/hooks/use-investment-config";

interface StatsCardsProps {
  direction: InvestmentDirection | null;
  fundsCount: number;
  totalHoldingCost: number;
  isMobile: boolean;
}

export default function StatsCards({
  direction,
  fundsCount,
  totalHoldingCost,
  isMobile,
}: StatsCardsProps) {
  const { assetLabel } = useInvestmentConfig(direction?.type);

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 12 : 24 }}>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title={`${assetLabel}数量`}
            value={fundsCount}
            suffix="个"
            prefix={<FundOutlined />}
            styles={{ content: { fontSize: isMobile ? 20 : 24 } }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title={
              <Space>
                预期投入
                <Tooltip title="您为该投资方向设定的目标投入金额，用于跟踪投资进度">
                  <QuestionCircleOutlined
                    style={{
                      color: "#1890ff",
                      cursor: "help",
                      fontSize: 12,
                    }}
                  />
                </Tooltip>
              </Space>
            }
            value={direction?.expectedAmount || 0}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{
              content: { color: "#1890ff", fontSize: isMobile ? 18 : 24 },
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title={
              <Space>
                实际投入
                <Tooltip title={`当前持仓成本总和，卖出时按平均成本扣减，不包括已清仓的${assetLabel}。用于计算投入进度（实际投入 ÷ 预期投入）。`}>
                  <QuestionCircleOutlined
                    style={{
                      color: "#1890ff",
                      cursor: "help",
                      fontSize: 12,
                    }}
                  />
                </Tooltip>
              </Space>
            }
            value={totalHoldingCost}
            precision={isMobile ? 0 : 2}
            prefix="¥"
            styles={{
              content: { color: "#52c41a", fontSize: isMobile ? 18 : 24 },
            }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic
            title={
              <Space>
                投入进度
                <Tooltip title="实际投入 ÷ 预期投入 × 100%，反映投资计划的完成度">
                  <QuestionCircleOutlined
                    style={{
                      color: "#1890ff",
                      cursor: "help",
                      fontSize: 12,
                    }}
                  />
                </Tooltip>
              </Space>
            }
            value={
              Number(direction?.expectedAmount) > 0
                ? (totalHoldingCost / Number(direction.expectedAmount)) * 100
                : 0
            }
            precision={1}
            suffix="%"
            styles={{
              content: {
                color:
                  totalHoldingCost >= Number(direction?.expectedAmount || 0)
                    ? "#52c41a"
                    : "#faad14",
                fontSize: isMobile ? 18 : 24,
              },
            }}
          />
        </Card>
      </Col>
    </Row>
  );
}
