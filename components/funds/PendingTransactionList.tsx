import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Tooltip,
} from "antd";
import { ClockCircleOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PendingTransaction, Fund } from "@/types/fund";

const { Text } = Typography;

interface PendingTransactionListProps {
  pendingTransactions: PendingTransaction[];
  fund: Fund | null;
  isMobile: boolean;
  confirmLoading: boolean;
  onBatchConfirm: () => void;
  onConfirmDividend: (transaction: PendingTransaction) => void;
  onDeletePending: (id: number) => void;
}

export default function PendingTransactionList({
  pendingTransactions,
  fund,
  isMobile,
  confirmLoading,
  onBatchConfirm,
  onConfirmDividend,
  onDeletePending,
}: PendingTransactionListProps) {
  if (pendingTransactions.length === 0) return null;

  const isStock = fund?.direction?.type === "STOCK";
  const hasAutomaticConfirmation = pendingTransactions.some(
    (transaction) => transaction.type !== "DIVIDEND",
  );
  const typeTag = (type: string) => {
    if (type === "DIVIDEND") return <Tag color="blue">分红</Tag>;
    return <Tag color={type === "BUY" ? "green" : "red"}>{type === "BUY" ? "买入" : "卖出"}</Tag>;
  };
  const content = (transaction: PendingTransaction) =>
    transaction.type === "DIVIDEND"
      ? `预计 ¥${Number(transaction.applyAmount || 0).toLocaleString()}（${transaction.dividendReinvest ? "红利再投" : "现金"}）`
      : transaction.type === "BUY"
        ? `¥${Number(transaction.applyAmount).toLocaleString()}`
        : `${Number(transaction.applyShares)}${isStock ? "股" : "份"}`;

  const mobileContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {pendingTransactions.map((r) => (
        <Card size="small" key={r.id} bodyStyle={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#666" }}>
                {dayjs(r.applyDate).format(r.type === "DIVIDEND" ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm")}
              </div>
              <div style={{ marginTop: 6 }}>
                {typeTag(r.type)}
                <Text style={{ marginLeft: 8, fontWeight: 600, overflowWrap: "anywhere" }}>
                  {content(r)}
                </Text>
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div>
                <Tag color="orange">
                  {r.type === "DIVIDEND" ? "待人工确认" : isStock ? "等待价格" : "等待净值"}
                </Tag>
              </div>
              <Space size={0} style={{ marginTop: 6 }}>
                {r.type === "DIVIDEND" && (
                  <Button type="link" size="small" onClick={() => onConfirmDividend(r)}>
                    确认
                  </Button>
                )}
                <Popconfirm
                  title="确定撤销吗？"
                  onConfirm={() => onDeletePending(r.id)}
                >
                  <Button type="link" danger size="small">
                    撤销
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </div>

          {r.type === "DIVIDEND" ? (
            <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
              权益登记：{r.dividendRecordDate ? dayjs(r.dividendRecordDate).format("YYYY-MM-DD") : "-"}
              <br />每份分红：¥{Number(r.dividendPerShare || 0).toFixed(4)}
            </div>
          ) : (
          <div style={{ marginTop: 8, fontSize: 12, color: "#888" }}>
            <div>
              预计买入：
              {(() => {
                const applyDate = dayjs(r.applyDate);
                const isWeekend =
                  applyDate.day() === 0 || applyDate.day() === 6;
                const isAfter3PM = applyDate.hour() >= 15;

                let effectiveDate = applyDate;
                if (isWeekend || isAfter3PM) {
                  do {
                    effectiveDate = effectiveDate.add(1, "day");
                  } while (
                    effectiveDate.day() === 0 ||
                    effectiveDate.day() === 6
                  );
                }
                return effectiveDate.format("YYYY-MM-DD");
              })()}
            </div>
            <div style={{ marginTop: 4 }}>
              预计确认：
              {(() => {
                const applyDate = dayjs(r.applyDate);
                const isWeekend =
                  applyDate.day() === 0 || applyDate.day() === 6;
                const isAfter3PM = applyDate.hour() >= 15;

                let effectiveDate = applyDate;
                if (isWeekend || isAfter3PM) {
                  do {
                    effectiveDate = effectiveDate.add(1, "day");
                  } while (
                    effectiveDate.day() === 0 ||
                    effectiveDate.day() === 6
                  );
                }

                let confirmDate = effectiveDate;
                let days = fund?.confirmDays || 0;
                while (days > 0) {
                  confirmDate = confirmDate.add(1, "day");
                  if (confirmDate.day() !== 0 && confirmDate.day() !== 6) {
                    days--;
                  }
                }

                return confirmDate.format("YYYY-MM-DD");
              })()}
            </div>
          </div>
          )}
        </Card>
      ))}
    </div>
  );

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span style={{ fontSize: isMobile ? 14 : 16 }}>待确认交易</span>
        </Space>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={hasAutomaticConfirmation ? (
        <Button
          type="primary"
          size="small"
          icon={<SyncOutlined spin={confirmLoading} />}
          onClick={onBatchConfirm}
          loading={confirmLoading}
        >
          {isStock ? "检查成交" : "检查转正"}
        </Button>
      ) : null}
    >
      {isMobile ? (
        mobileContent
      ) : (
        <Table
          columns={[
            {
              title: "日期",
              dataIndex: "applyDate",
              key: "applyDate",
              render: (d: string, r: PendingTransaction) =>
                dayjs(d).format(r.type === "DIVIDEND" ? "YYYY-MM-DD" : "YYYY-MM-DD HH:mm"),
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              render: (t: string) => typeTag(t),
            },
            {
              title: "申请内容",
              key: "content",
              render: (_: unknown, r: PendingTransaction) => content(r),
            },
            {
              title: "生效/权益日",
              key: "estimatedBuyDate",
              render: (_: unknown, r: PendingTransaction) => {
                if (r.type === "DIVIDEND") {
                  return r.dividendRecordDate
                    ? dayjs(r.dividendRecordDate).format("YYYY-MM-DD")
                    : "-";
                }
                const applyDate = dayjs(r.applyDate);
                const isWeekend =
                  applyDate.day() === 0 || applyDate.day() === 6;
                const isAfter3PM = applyDate.hour() >= 15;

                let effectiveDate = applyDate;
                if (isWeekend || isAfter3PM) {
                  do {
                    effectiveDate = effectiveDate.add(1, "day");
                  } while (
                    effectiveDate.day() === 0 ||
                    effectiveDate.day() === 6
                  );
                }

                return (
                  <Tooltip
                    title={
                      isAfter3PM
                        ? "超过15:00顺延"
                        : isWeekend
                          ? "非交易日顺延"
                          : ""
                    }
                  >
                    <span>{effectiveDate.format("YYYY-MM-DD")}</span>
                    {(isAfter3PM || isWeekend) && (
                      <Text
                        type="secondary"
                        style={{ fontSize: 12, marginLeft: 4 }}
                      >
                        (顺延)
                      </Text>
                    )}
                  </Tooltip>
                );
              },
            },
            {
              title: "确认日期/单价",
              key: "estimatedConfirmDate",
              render: (_: unknown, r: PendingTransaction) => {
                if (r.type === "DIVIDEND") {
                  return `¥${Number(r.dividendPerShare || 0).toFixed(4)}/份`;
                }
                const applyDate = dayjs(r.applyDate);
                const isWeekend =
                  applyDate.day() === 0 || applyDate.day() === 6;
                const isAfter3PM = applyDate.hour() >= 15;

                let effectiveDate = applyDate;
                if (isWeekend || isAfter3PM) {
                  do {
                    effectiveDate = effectiveDate.add(1, "day");
                  } while (
                    effectiveDate.day() === 0 ||
                    effectiveDate.day() === 6
                  );
                }

                let confirmDate = effectiveDate;
                let days = fund?.confirmDays || 0;
                while (days > 0) {
                  confirmDate = confirmDate.add(1, "day");
                  if (confirmDate.day() !== 0 && confirmDate.day() !== 6) {
                    days--;
                  }
                }

                return confirmDate.format("YYYY-MM-DD");
              },
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (_: unknown, r: PendingTransaction) => (
                <Tag color="orange">
                  {r.type === "DIVIDEND" ? "待人工确认" : isStock ? "等待价格" : "等待净值"}
                </Tag>
              ),
            },
            {
              title: "操作",
              key: "action",
              render: (_: unknown, r: PendingTransaction) => (
                <Space size={0}>
                  {r.type === "DIVIDEND" && (
                    <Button type="link" size="small" onClick={() => onConfirmDividend(r)}>
                      确认
                    </Button>
                  )}
                  <Popconfirm
                    title="确定撤销吗？"
                    onConfirm={() => onDeletePending(r.id)}
                  >
                    <Button type="link" danger size="small">
                      撤销
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          dataSource={pendingTransactions}
          rowKey="id"
          pagination={false}
          size="small"
        />
      )}
    </Card>
  );
}
