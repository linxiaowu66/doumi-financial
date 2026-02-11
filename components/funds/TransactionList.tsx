import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Flex,
  Row,
  Col,
} from "antd";
import { PlusOutlined, DeleteOutlined, EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Transaction } from "@/types/fund";
import type { ColumnsType } from "antd/es/table";

const { Text } = Typography;

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
  isMobile: boolean;
  onPlanModalOpen: () => void;
  onDelete: (id: number) => void;
  onEdit: (transaction: Transaction) => void;
}

export default function TransactionList({
  transactions,
  loading,
  isMobile,
  onPlanModalOpen,
  onDelete,
  onEdit,
}: TransactionListProps) {
  const renderMobileTransactionCard = (transaction: Transaction) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      BUY: { text: "买入", color: "green" },
      SELL: { text: "卖出", color: "red" },
      DIVIDEND: {
        text: transaction.dividendReinvest ? "红利再投资" : "红利现金",
        color: "blue",
      },
    };
    const typeInfo = typeMap[transaction.type] || {
      text: transaction.type,
      color: "default",
    };

    return (
      <Card key={transaction.id} size="small" style={{ marginBottom: 12 }}>
        <Flex
          justify="space-between"
          align="flex-start"
          style={{ marginBottom: 8 }}
        >
          <Space>
            <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(transaction.date).format("YYYY/M/D")}
            </Text>
          </Space>
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(transaction)}
            />
            <Popconfirm
              title="确定要删除吗？"
              onConfirm={() => onDelete(transaction.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        </Flex>
        <Row gutter={[8, 8]}>
          {transaction.type === "BUY" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>买入金额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  ¥{Number(transaction.amount).toLocaleString()}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Number(transaction.price).toFixed(4)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>份额</div>
                <div style={{ fontSize: 14 }}>
                  {Math.abs(Number(transaction.shares)).toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>差值</div>
                <div style={{ fontSize: 14 }}>
                  {(() => {
                    const currentPriceNum = Number(transaction.price);
                    // 找到所有买入交易，按日期正序排列（最早的在前）
                    const buyTransactions = transactions
                      .filter((t) => t.type === "BUY")
                      .sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime()
                      );
                    const currentIndex = buyTransactions.findIndex(
                      (t) => t.id === transaction.id
                    );

                    if (currentIndex === -1) return "-";

                    // 第一笔交易没有差值
                    if (currentIndex === 0) return "-";

                    // 与上一笔买入交易的净值比较
                    const prevTransaction = buyTransactions[currentIndex - 1];
                    const comparePrice = Number(prevTransaction.price);
                    const diff = currentPriceNum - comparePrice;

                    const diffPercent =
                      comparePrice > 0 ? (diff / comparePrice) * 100 : 0;
                    const color = diff >= 0 ? "#cf1322" : "#3f8600";

                    return (
                      <span style={{ color }}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(4)} ({diff >= 0 ? "+" : ""}
                        {diffPercent.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              </Col>
              {transaction.fee > 0 && (
                <Col span={12}>
                  <div style={{ fontSize: 11, color: "#999" }}>手续费</div>
                  <div style={{ fontSize: 14 }}>
                    ¥{Number(transaction.fee).toFixed(2)}
                  </div>
                </Col>
              )}
            </>
          )}
          {transaction.type === "SELL" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>卖出份额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {Math.abs(Number(transaction.shares)).toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Number(transaction.price).toFixed(4)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>卖出金额</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Math.abs(Number(transaction.amount)).toLocaleString()}
                </div>
              </Col>
              {transaction.fee > 0 && (
                <Col span={12}>
                  <div style={{ fontSize: 11, color: "#999" }}>手续费</div>
                  <div style={{ fontSize: 14 }}>
                    ¥{Number(transaction.fee).toFixed(2)}
                  </div>
                </Col>
              )}
            </>
          )}
          {transaction.type === "DIVIDEND" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>分红金额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  ¥{Number(transaction.amount).toLocaleString()}
                </div>
              </Col>
              {transaction.dividendReinvest && (
                <>
                  <Col span={12}>
                    <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                    <div style={{ fontSize: 14 }}>
                      ¥{Number(transaction.price).toFixed(4)}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 11, color: "#999" }}>
                      再投资份额
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {Number(transaction.shares).toFixed(2)}
                    </div>
                  </Col>
                </>
              )}
            </>
          )}
        </Row>
        {transaction.remark && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              备注：{transaction.remark}
            </Text>
          </div>
        )}
      </Card>
    );
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: "日期",
      dataIndex: "date",
      key: "date",
      width: 110,
      align: "center",
      render: (date: string) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {dayjs(date).format("YYYY/M/D")}
        </span>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 90,
      align: "center",
      render: (type: string, record: Transaction) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          BUY: { text: "买入", color: "green" },
          SELL: { text: "卖出", color: "red" },
          DIVIDEND: {
            text: record.dividendReinvest ? "红利再投资" : "红利现金",
            color: "blue",
          },
        };
        const info = typeMap[type] || { text: type, color: "default" };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: "买入金额",
      dataIndex: "amount",
      key: "buyAmount",
      align: "center",
      width: 110,
      render: (amount: number, record: Transaction) =>
        record.type === "BUY" ? `¥${Number(amount).toLocaleString()}` : "-",
    },
    {
      title: "手续费",
      dataIndex: "fee",
      key: "fee",
      align: "center",
      width: 85,
      render: (fee: number) =>
        Number(fee) > 0 ? `¥${Number(fee).toFixed(2)}` : "-",
    },
    {
      title: "净值",
      dataIndex: "price",
      key: "price",
      align: "center",
      width: 90,
      render: (price: number) => Number(price).toFixed(4),
    },
    {
      title: "差值",
      key: "priceDiff",
      align: "center",
      width: 100,
      render: (_: unknown, record: Transaction) => {
        if (record.type !== "BUY") {
          return "-";
        }

        const currentPriceNum = Number(record.price);
        const buyTransactions = transactions
          .filter((t) => t.type === "BUY")
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
        const currentIndex = buyTransactions.findIndex(
          (t) => t.id === record.id
        );

        if (currentIndex === -1 || currentIndex === 0) {
          return "-";
        }

        const prevTransaction = buyTransactions[currentIndex - 1];
        const comparePrice = Number(prevTransaction.price);
        const diff = currentPriceNum - comparePrice;
        const diffPercent = comparePrice > 0 ? (diff / comparePrice) * 100 : 0;
        const color = diff >= 0 ? "#cf1322" : "#3f8600";

        return (
          <div>
            <div style={{ color, fontSize: 13 }}>
              {diff >= 0 ? "+" : ""}
              {diff.toFixed(4)}
            </div>
            <div style={{ color, fontSize: 11, opacity: 0.7 }}>
              ({diff >= 0 ? "+" : ""}
              {diffPercent.toFixed(2)}%)
            </div>
          </div>
        );
      },
    },
    {
      title: "份额",
      dataIndex: "shares",
      key: "shares",
      align: "center",
      width: 110,
      render: (shares: number) => {
        const sharesNum = Number(shares);
        const isNegative = sharesNum < 0;
        return (
          <Text type={isNegative ? "danger" : undefined}>
            {sharesNum.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      align: "center",
      ellipsis: true,
      render: (remark: string) => remark || "-",
    },
    {
      title: "操作",
      key: "action",
      align: "center",
      width: 140,
      fixed: "right",
      render: (_: unknown, record: Transaction) => (
        <Space size={0}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除吗？"
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

  return (
    <Card
      title={
        <span
          style={{ fontSize: isMobile ? 14 : 16 }}
        >{`交易记录（${transactions.length}笔）`}</span>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={
        isMobile && (
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={onPlanModalOpen}
          >
            计划买入
          </Button>
        )
      }
    >
      {isMobile ? (
        <div>
          {transactions.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: "#999",
              }}
            >
              暂无交易记录
            </div>
          ) : (
            transactions.map((transaction) =>
              renderMobileTransactionCard(transaction)
            )
          )}
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={transactions}
          loading={loading}
          rowKey="id"
          scroll={{ x: "max-content" }}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      )}
    </Card>
  );
}
