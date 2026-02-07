import {
  Card,
  Space,
  Tag,
  Tooltip,
  Typography,
  Table,
  Button,
  Popconfirm,
  Badge,
  Row,
  Col,
  Flex,
} from "antd";
import {
  LineChartOutlined,
  EditOutlined,
  DeleteOutlined,
  QuestionCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FundOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { Fund, FundStats, FundAlert, CategoryPositionAlert, CategoryTarget, InvestmentDirection } from "@/types/investment-direction-detail";

const { Text } = Typography;

interface FundListProps {
  funds: Fund[];
  fundsStats: Map<number, FundStats>;
  categoryTargets: CategoryTarget[];
  direction: InvestmentDirection | null;
  categoryAlerts: Map<string, FundAlert[]>;
  categoryPositionAlerts: Map<string, CategoryPositionAlert>;
  loading: boolean;
  isMobile: boolean;
  onOpenModal: (fund?: Fund) => void;
  onDelete: (id: number) => void;
  onOpenTargetModal: (categoryName: string, currentTargetPercent?: number) => void;
  isFundLiquidated: (stats: FundStats | undefined) => boolean;
}

export default function FundList({
  funds,
  fundsStats,
  categoryTargets,
  direction,
  categoryAlerts,
  categoryPositionAlerts,
  loading,
  isMobile,
  onOpenModal,
  onDelete,
  onOpenTargetModal,
  isFundLiquidated,
}: FundListProps) {
  const router = useRouter();

  // 按分类分组
  const groupedFunds = funds.reduce((groups, fund) => {
    const category = fund.category || "未分类";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(fund);
    return groups;
  }, {} as Record<string, Fund[]>);

  // 先计算整个投资方向的总市值（所有基金的当前市值之和）
  const totalDirectionValue = funds.reduce((sum, fund) => {
    const stats = fundsStats.get(fund.id);
    if (stats) {
      const holdingProfit =
        (stats.holdingCost * stats.holdingProfitRate) / 100;
      return sum + stats.holdingCost + holdingProfit;
    }
    return sum;
  }, 0);

  const columns = [
    {
      title: "基金代码",
      dataIndex: "code",
      key: "code",
      width: 90,
    },
    {
      title: "基金名称",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      render: (text: string, record: Fund) => {
        const stats = fundsStats.get(record.id);
        const isLiquidated = isFundLiquidated(stats);
        return (
          <Flex align="center" gap="small" style={{ width: "100%" }}>
            <Text
              strong
              style={{
                maxWidth: record.remark || isLiquidated ? "120px" : "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              title={text}
            >
              {text}
            </Text>
            {isLiquidated && (
              <Tag
                color="red"
                style={{
                  fontSize: 12,
                  flexShrink: 0,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                已清仓
              </Tag>
            )}
            {record.remark && (
              <Tooltip title={record.remark} placement="top">
                <Tag
                  color="blue"
                  style={{ fontSize: 12, flexShrink: 0, margin: 0, cursor: 'help' }}
                >
                  有备注
                </Tag>
              </Tooltip>
            )}
          </Flex>
        );
      },
    },
    {
      title: (
        <Space>
          持仓收益率
          <Tooltip title="(当前市值 - 持仓成本) ÷ 持仓成本 × 100%，反映当前持仓的收益率">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "holdingProfitRate",
      align: "right" as const,
      width: 110,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.holdingProfitRate && stats?.holdingProfitRate !== 0) {
          return "-";
        }
        const rate = stats.holdingProfitRate;
        const color = rate >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? "+" : ""}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: (
        <Space>
          累计收益率
          <Tooltip title="累计总收益 ÷ 总投入 × 100%，包括持仓收益、卖出收益和分红">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "totalProfitRate",
      align: "right" as const,
      width: 110,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfitRate && stats?.totalProfitRate !== 0) {
          return "-";
        }
        const rate = stats.totalProfitRate;
        const color = rate >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? "+" : ""}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: (
        <Space>
          累计收益金额
          <Tooltip title="持仓收益 + 卖出收益 + 分红的总和，反映该基金的整体盈亏">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "totalProfit",
      align: "right" as const,
      width: 120,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfit && stats?.totalProfit !== 0) {
          return "-";
        }
        const profit = stats.totalProfit;
        const color = profit >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
          </span>
        );
      },
    },
    {
      title: "交易记录",
      key: "transactions",
      align: "center" as const,
      width: 85,
      render: (_: unknown, record: Fund) => record._count?.transactions || 0,
    },
    {
      title: "待买入",
      key: "planned",
      align: "center" as const,
      width: 80,
      render: (_: unknown, record: Fund) => {
        const count = record._count?.plannedPurchases || 0;
        return count > 0 ? <Tag color="orange">{count}</Tag> : 0;
      },
    },
    {
      title: "待确认",
      key: "pending",
      align: "center" as const,
      width: 80,
      render: (_: unknown, record: Fund) => {
        const count = record._count?.pendingTransactions || 0;
        return count > 0 ? (
          <Tooltip title={`${count} 笔交易等待确认净值`}>
            <Badge count={count} size="small" offset={[5, 0]}>
              <ClockCircleOutlined style={{ color: '#faad14', fontSize: 16 }} />
            </Badge>
          </Tooltip>
        ) : 0;
      },
    },
    {
      title: "操作",
      key: "action",
      align: "center" as const,
      width: 110,
      fixed: "right" as const,
      render: (_: unknown, record: Fund) => (
        <Space>
          <Button
            type="link"
            icon={<LineChartOutlined />}
            onClick={() => {
              // 保存滚动位置
              const scrollKey = `scroll-position-${direction?.id}`;
              sessionStorage.setItem(scrollKey, window.scrollY.toString());
              router.push(`/funds/${record.id}`);
            }}
            size="small"
            title="详情"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => onOpenModal(record)}
            size="small"
            title="编辑"
          />
          <Popconfirm
            title="确定要删除吗？"
            description="删除后该基金的所有交易记录也会被删除"
            onConfirm={() => onDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderMobileFundCard = (fund: Fund) => {
    const stats = fundsStats.get(fund.id);
    return (
      <Card
        key={fund.id}
        size="small"
        style={{ marginBottom: 12 }}
        onClick={() => {
          // 保存滚动位置
          const scrollKey = `scroll-position-${direction?.id}`;
          sessionStorage.setItem(scrollKey, window.scrollY.toString());
          router.push(`/funds/${fund.id}`);
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <Flex justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Flex align="center" gap="small" wrap="wrap">
                <Text strong style={{ fontSize: 14 }}>
                  {fund.name}
                </Text>
                {isFundLiquidated(stats) && (
                  <Tag
                    color="red"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    已清仓
                  </Tag>
                )}
                {fund.remark && (
                  <Tooltip title={fund.remark} placement="top">
                    <Tag
                      color="blue"
                      style={{
                        fontSize: 11,
                        margin: 0,
                        cursor: 'help',
                      }}
                    >
                      有备注
                    </Tag>
                  </Tooltip>
                )}
              </Flex>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {fund.code}
              </Text>
            </div>
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenModal(fund);
                }}
              />
              <Popconfirm
                title="确定要删除吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  onDelete(fund.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          </Flex>
        </div>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>持仓成本</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1890ff" }}>
              ¥{stats?.holdingCost?.toLocaleString() || "-"}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>持仓份额</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {stats?.holdingShares?.toLocaleString() || "-"}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>交易记录</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.transactions || 0} 笔
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>待确认</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.pendingTransactions ? (
                <Space>
                  <ClockCircleOutlined style={{ color: '#faad14' }} />
                  <Text type="warning">{fund._count.pendingTransactions}</Text>
                </Space>
              ) : (
                "0"
              )}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>待买入</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.plannedPurchases ? (
                <Tag color="orange">{fund._count.plannedPurchases}</Tag>
              ) : (
                "0"
              )}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <>
      {Object.entries(groupedFunds).map(
        ([category, categoryFunds]) => {
          // 计算该分类下所有基金的持仓成本总和（已投入）
          const categoryHoldingCost = categoryFunds.reduce((sum, fund) => {
            const stats = fundsStats.get(fund.id);
            return sum + (stats?.holdingCost || 0);
          }, 0);

          // 计算该分类下所有基金的当前市值总和（持仓成本 + 持仓收益）
          const categoryCurrentValue = categoryFunds.reduce((sum, fund) => {
            const stats = fundsStats.get(fund.id);
            if (stats) {
              const holdingProfit =
                (stats.holdingCost * stats.holdingProfitRate) / 100;
              return sum + stats.holdingCost + holdingProfit;
            }
            return sum;
          }, 0);

          const categoryTarget = categoryTargets.find(
            (t) => t.categoryName === category
          );
          const targetPercent = categoryTarget?.targetPercent || 0;
          const targetAmount =
            targetPercent > 0 && direction?.expectedAmount
              ? (Number(direction.expectedAmount) * targetPercent) / 100
              : 0;
          const progress =
            targetAmount > 0
              ? (categoryHoldingCost / Number(targetAmount)) * 100
              : 0;

          const actualPositionPercent =
            totalDirectionValue > 0
              ? (categoryCurrentValue / totalDirectionValue) * 100
              : 0;

          return (
            <Card
              key={category}
              id={`category-${encodeURIComponent(category)}`}
              title={
                <Flex
                  justify="space-between"
                  align={isMobile ? "flex-start" : "center"}
                  vertical={isMobile}
                  gap={isMobile ? 8 : 0}
                >
                  <Space wrap>
                    <Tag color="blue">{category}</Tag>
                    <Text type="secondary">
                      {categoryFunds.length} 只基金
                    </Text>
                    {categoryAlerts.has(category) && (
                      <Tooltip
                        title={
                          <div>
                            {Array.from(
                              new Map(
                                categoryAlerts
                                  .get(category)!
                                  .map((alert) => [alert.fundId, alert])
                              ).values()
                            ).map((alert) => (
                              <div
                                key={`${alert.fundId}-${alert.reason}`}
                                style={{ marginBottom: 4 }}
                              >
                                {alert.reason === "days" &&
                                alert.fundId === 0 ? (
                                  <div>
                                    <strong>{alert.fundName}</strong>{" "}
                                    分类距离上次买入已超过
                                    {alert.daysSinceLastBuy}天
                                  </div>
                                ) : (
                                  <>
                                    <strong>{alert.fundName}</strong>:
                                    {alert.reason === "days" && (
                                      <span>
                                        {" "}
                                        距离上次买入已超过
                                        {alert.daysSinceLastBuy}天
                                      </span>
                                    )}
                                    {alert.reason === "price" && (
                                      <span>
                                        {" "}
                                        净值相比上次买入下跌
                                        {alert.priceDropPercent?.toFixed(2)}
                                        %
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        }
                      >
                        <Tag
                          color="orange"
                          icon={<ExclamationCircleOutlined />}
                          style={{ cursor: "help" }}
                        >
                          {(() => {
                            const fundAlerts = categoryAlerts
                              .get(category)!
                              .filter((a) => a.fundId !== 0);
                            const categoryAlert = categoryAlerts
                              .get(category)!
                              .find(
                                (a) => a.fundId === 0 && a.reason === "days"
                              );

                            if (fundAlerts.length > 0 && categoryAlert) {
                              return `有${fundAlerts.length}只基金需要关注，分类超过30天未买入`;
                            } else if (fundAlerts.length > 0) {
                              return `有${fundAlerts.length}只基金需要关注`;
                            } else if (categoryAlert) {
                              return "分类超过30天未买入";
                            }
                            return "需要关注";
                          })()}
                        </Tag>
                      </Tooltip>
                    )}
                    {categoryPositionAlerts.has(category) && (
                      <Tooltip
                        title={
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <strong>仓位超标提醒</strong>
                            </div>
                            <div>
                              当前市值: ¥
                              {categoryPositionAlerts
                                .get(category)!
                                .currentValue.toLocaleString()}
                            </div>
                            <div>
                              目标仓位: ¥
                              {categoryPositionAlerts
                                .get(category)!
                                .targetAmount.toLocaleString()}
                            </div>
                            <div>
                              超标:{" "}
                              {categoryPositionAlerts
                                .get(category)!
                                .excessPercent.toFixed(2)}
                              %
                            </div>
                            <div
                              style={{
                                marginTop: 8,
                                fontSize: 12,
                                color: "#999",
                              }}
                            >
                              建议进行仓位平衡，避免仓位过大
                            </div>
                          </div>
                        }
                      >
                        <Tag
                          color="red"
                          icon={<ExclamationCircleOutlined />}
                          style={{ cursor: "help" }}
                        >
                          仓位超标
                        </Tag>
                      </Tooltip>
                    )}
                  </Space>
                  <Space wrap>
                    {targetAmount > 0 ? (
                      <>
                        <Text
                          type="secondary"
                          style={{ fontSize: isMobile ? 12 : 14 }}
                        >
                          {isMobile ? "已投入" : "已投入"}: ¥
                          {categoryHoldingCost.toLocaleString()}
                          {!isMobile &&
                            ` / 目标: ¥${Number(
                              targetAmount
                            ).toLocaleString()}${
                              targetPercent > 0
                                ? ` (${Number(targetPercent).toFixed(1)}%)`
                                : ""
                            }`}
                        </Text>
                        <Tag
                          color={progress >= 100 ? "success" : "processing"}
                        >
                          {progress.toFixed(1)}%
                        </Tag>
                        <Text
                          type="secondary"
                          style={{ fontSize: isMobile ? 12 : 14 }}
                        >
                          {isMobile ? "当前市值" : "当前市值"}: ¥
                          {categoryCurrentValue.toLocaleString()}
                          {!isMobile &&
                            ` (${actualPositionPercent.toFixed(1)}%)`}
                        </Text>
                        {isMobile && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            占比: {actualPositionPercent.toFixed(1)}%
                          </Text>
                        )}
                      </>
                    ) : (
                      <>
                        <Text type="secondary">
                          已投入: ¥{categoryHoldingCost.toLocaleString()}
                        </Text>
                        <Text type="secondary">
                          当前市值: ¥{categoryCurrentValue.toLocaleString()}
                        </Text>
                        <Text type="secondary">
                          占比: {actualPositionPercent.toFixed(1)}%
                        </Text>
                      </>
                    )}
                    <Button
                      size="small"
                      type="link"
                      onClick={() =>
                        onOpenTargetModal(category, targetPercent)
                      }
                    >
                      设置目标
                    </Button>
                  </Space>
                </Flex>
              }
              style={{ marginBottom: isMobile ? 12 : 16 }}
            >
              {isMobile ? (
                // 移动端：卡片列表
                <div>
                  {categoryFunds.map((fund) => renderMobileFundCard(fund))}
                </div>
              ) : (
                // 桌面端：表格
                <Table
                  columns={columns}
                  dataSource={categoryFunds}
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 886 }}
                  size="small"
                />
              )}
            </Card>
          );
        }
      )}

      {funds.length === 0 && !loading && (
        <Card>
          <Flex
            vertical
            align="center"
            justify="center"
            style={{ padding: "40px 0" }}
          >
            <FundOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
            <Text type="secondary" style={{ marginTop: 16 }}>
              还没有添加基金，点击&ldquo;新建基金&rdquo;开始
            </Text>
          </Flex>
        </Card>
      )}
    </>
  );
}
