import {
  Card,
  Space,
  Button,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Divider,
} from "antd";
import { DollarOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { DirectionSummary } from "@/types/investment-direction-detail";
import { useInvestmentConfig } from "@/hooks/use-investment-config";

const { Text } = Typography;

interface IncomeSummaryProps {
  summary: DirectionSummary | null;
  onRefresh: () => void;
  directionType?: "FUND" | "STOCK";
}

export default function IncomeSummary({ summary, onRefresh, directionType }: IncomeSummaryProps) {
  const { assetLabel, unit, priceLabel } = useInvestmentConfig(directionType);
  
  if (!summary) return null;

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>收益汇总</span>
        </Space>
      }
      className="mb-6"
      extra={
        <Button size="small" onClick={onRefresh}>
          刷新
        </Button>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                历史总投入
                <Tooltip title={`历史上所有买入交易的金额总和，包括已清仓的${assetLabel}。用于计算累计收益率（累计总收益 ÷ 历史总投入）。即使${assetLabel}已全部卖出，其买入金额仍会计入历史总投入。`}>
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
            value={parseFloat(summary.totalInvested)}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                当前市值
                <Tooltip title={`当前持仓${unit} × 最新${priceLabel}，反映持仓的当前价值`}>
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
            value={parseFloat(summary.totalCurrentValue)}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                持仓成本
                <Tooltip title={`当前持仓${unit}的成本价总和，不包括已清仓的${assetLabel}。如果${assetLabel}已全部卖出，其成本不会计入持仓成本。`}>
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
            value={parseFloat(summary.totalCost)}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                持仓收益
                <Tooltip title="当前市值 - 持仓成本，反映当前持仓的盈亏情况">
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
            value={parseFloat(summary.holdingProfit)}
            precision={2}
            prefix="¥"
            valueStyle={{
              fontSize: 18,
              color:
                parseFloat(summary.holdingProfit) >= 0
                  ? "#cf1322"
                  : "#3f8600",
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                昨日收益
                <Tooltip title={`基于最近两个交易日${priceLabel}计算的今日/昨日盈亏之差（方向层面）`}>
                  <QuestionCircleOutlined
                    style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
                  />
                </Tooltip>
              </Space>
            }
            value={parseFloat(summary.yesterdayProfit || '0')}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18 }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                年化收益
                <Tooltip title="基于累计收益率按复利年化（CAGR），起始日为方向中最早的一笔买入交易日期">
                  <QuestionCircleOutlined
                    style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
                  />
                </Tooltip>
              </Space>
            }
            value={parseFloat(summary.annualYield || '0')}
            precision={2}
            suffix="%"
            valueStyle={{ fontSize: 20, fontWeight: 'bold', color: parseFloat(summary.annualYield || '0') >= 0 ? '#cf1322' : '#3f8600' }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                累计总收益
                <Tooltip title="持仓收益 + 卖出收益 + 现金分红 + 分红再投资，反映整体投资盈亏">
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
            value={parseFloat(summary.totalProfit)}
            precision={2}
            prefix="¥"
            valueStyle={{
              fontSize: 20,
              fontWeight: "bold",
              color:
                parseFloat(summary.totalProfit) >= 0 ? "#cf1322" : "#3f8600",
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                累计收益率
                <Tooltip title={`累计总收益 ÷ 历史总投入 × 100%，反映投资回报率。历史总投入包括已清仓的${assetLabel}，用于衡量整体投资表现。`}>
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
            value={parseFloat(summary.totalProfitRate)}
            precision={2}
            suffix="%"
            valueStyle={{
              fontSize: 20,
              fontWeight: "bold",
              color:
                parseFloat(summary.totalProfitRate) >= 0
                  ? "#cf1322"
                  : "#3f8600",
            }}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                卖出收益
                <Tooltip title={`已卖出${assetLabel}的收益总和，卖出收益 = 卖出金额 - 成本 - 手续费`}>
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
            value={parseFloat(summary.totalSellProfit)}
            precision={2}
            prefix="¥"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Statistic
            title={
              <Space>
                现金分红
                <Tooltip title={`${assetLabel}派发的现金分红总额，已到账的现金收益`}>
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
            value={parseFloat(summary.totalDividendCash)}
            precision={2}
            prefix="¥"
          />
        </Col>
      </Row>
      <Divider style={{ margin: "16px 0" }} />
      <Text type="secondary">
        包含{summary.fundCount}只${assetLabel}的完整收益统计，累计收益 = 持仓收益 +
        卖出收益 + 现金分红 + 分红再投资
      </Text>
    </Card>
  );
}
