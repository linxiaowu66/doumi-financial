import {
  Card,
  Space,
  Table,
  Typography,
  Tag,
  Tooltip,
  Row,
  Col,
  Flex,
} from "antd";
import { DollarOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { ExtendedTransaction, Fund } from "@/types/investment-direction-detail";

const { Text } = Typography;

interface RecentTransactionsProps {
  funds: Fund[];
  isMobile: boolean;
}

export default function RecentTransactions({
  funds,
  isMobile,
}: RecentTransactionsProps) {
  // 从所有基金中提取所有交易记录
  const allTransactions: ExtendedTransaction[] = [];

  funds.forEach((fund) => {
    if (fund.transactions && fund.transactions.length > 0) {
      fund.transactions.forEach((tx) => {
        allTransactions.push({
          ...tx,
          fundId: fund.id,
          fundName: fund.name,
          fundCode: fund.code,
        });
      });
    }
  });

  // 按日期倒序排序，取最新的5笔
  const recentTransactions = allTransactions
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // 最新的在前
    })
    .slice(0, 5);

  const typeMap: Record<string, { label: string; color: string }> = {
    BUY: { label: "买入", color: "#52c41a" },
    SELL: { label: "卖出", color: "#ff4d4f" },
    DIVIDEND: { label: "分红", color: "#1890ff" },
  };

  return (
    <Card
      title={
        <Space>
          <DollarOutlined />
          <span>最近5笔投资记录</span>
        </Space>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
    >
      {recentTransactions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          暂无交易记录
        </div>
      ) : (
        <div>
          {isMobile ? (
            // 移动端：卡片列表
            <div>
              {recentTransactions.map((tx) => {
                const typeInfo = typeMap[tx.type] || {
                  label: tx.type,
                  color: "#999",
                };
                return (
                  <Card key={tx.id} size="small" style={{ marginBottom: 12 }}>
                    <Flex
                      justify="space-between"
                      align="flex-start"
                      vertical
                      gap={8}
                    >
                      <Flex
                        justify="space-between"
                        align="center"
                        style={{ width: "100%" }}
                      >
                        <Text strong style={{ fontSize: 14 }}>
                          {tx.fundName}
                        </Text>
                        <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                      </Flex>
                      <Row gutter={[8, 8]} style={{ width: "100%" }}>
                        <Col span={12}>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            日期
                          </Text>
                          <div style={{ fontSize: 13 }}>
                            {dayjs(tx.date).format("YYYY-MM-DD")}
                          </div>
                        </Col>
                        {tx.amount !== undefined && (
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              金额
                            </Text>
                            <div style={{ fontSize: 13 }}>
                              ¥{Number(tx.amount).toLocaleString()}
                            </div>
                          </Col>
                        )}
                        {tx.shares !== undefined && (
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              份额
                            </Text>
                            <div style={{ fontSize: 13 }}>
                              {Number(tx.shares).toFixed(2)}
                            </div>
                          </Col>
                        )}
                        {tx.price !== undefined && tx.price !== null && (
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              净值
                            </Text>
                            <div style={{ fontSize: 13 }}>
                              ¥{Number(tx.price).toFixed(4)}
                            </div>
                          </Col>
                        )}
                      </Row>
                    </Flex>
                  </Card>
                );
              })}
            </div>
          ) : (
            // 桌面端：表格
            <Table
              dataSource={recentTransactions}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: "日期",
                  dataIndex: "date",
                  key: "date",
                  width: 110,
                  render: (date: string) => dayjs(date).format("YYYY-MM-DD"),
                },
                {
                  title: "基金名称",
                  dataIndex: "fundName",
                  key: "fundName",
                  width: 180,
                  ellipsis: true,
                  render: (name: string, record: ExtendedTransaction) => (
                    <Tooltip title={`${record.fundCode} - ${name}`}>
                      <Text strong>{name}</Text>
                    </Tooltip>
                  ),
                },
                {
                  title: "操作类型",
                  dataIndex: "type",
                  key: "type",
                  width: 100,
                  align: "center" as const,
                  render: (type: string) => {
                    const typeInfo = typeMap[type] || {
                      label: type,
                      color: "#999",
                    };
                    return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>;
                  },
                },
                {
                  title: "金额",
                  dataIndex: "amount",
                  key: "amount",
                  width: 120,
                  align: "right" as const,
                  render: (amount: number | undefined) =>
                    amount !== undefined
                      ? `¥${Number(amount).toLocaleString()}`
                      : "-",
                },
                {
                  title: "份额",
                  dataIndex: "shares",
                  key: "shares",
                  width: 110,
                  align: "right" as const,
                  render: (shares: number | undefined) =>
                    shares !== undefined ? Number(shares).toFixed(2) : "-",
                },
                {
                  title: "净值",
                  dataIndex: "price",
                  key: "price",
                  width: 100,
                  align: "right" as const,
                  render: (price: number | undefined) =>
                    price !== undefined && price !== null
                      ? `¥${Number(price).toFixed(4)}`
                      : "-",
                },
                {
                  title: "备注",
                  dataIndex: "remark",
                  key: "remark",
                  ellipsis: true,
                  render: (remark: string | null) => remark || "-",
                },
              ]}
            />
          )}
        </div>
      )}
    </Card>
  );
}
