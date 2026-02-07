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
  onDeletePending: (id: number) => void;
}

export default function PendingTransactionList({
  pendingTransactions,
  fund,
  isMobile,
  confirmLoading,
  onBatchConfirm,
  onDeletePending,
}: PendingTransactionListProps) {
  if (pendingTransactions.length === 0) return null;

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          <span style={{ fontSize: isMobile ? 14 : 16 }}>待确认交易</span>
        </Space>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={
        <Button
          type="primary"
          size="small"
          icon={<SyncOutlined spin={confirmLoading} />}
          onClick={onBatchConfirm}
          loading={confirmLoading}
        >
          检查转正
        </Button>
      }
    >
      <Table
        columns={[
          {
            title: "申请日期",
            dataIndex: "applyDate",
            key: "applyDate",
            render: (d: string) => dayjs(d).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "类型",
            dataIndex: "type",
            key: "type",
            render: (t: string) => (
              <Tag color={t === "BUY" ? "green" : "red"}>
                {t === "BUY" ? "买入" : "卖出"}
              </Tag>
            ),
          },
          {
            title: "申请内容",
            key: "content",
            render: (_: unknown, r: PendingTransaction) =>
              r.type === "BUY"
                ? `¥${Number(r.applyAmount).toLocaleString()}`
                : `${Number(r.applyShares)}份`,
          },
          {
            title: "预计买入日期",
            key: "estimatedBuyDate",
            render: (_: unknown, r: PendingTransaction) => {
              const applyDate = dayjs(r.applyDate);
              const isWeekend = applyDate.day() === 0 || applyDate.day() === 6;
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
            title: "预计确认日期",
            key: "estimatedConfirmDate",
            render: (_: unknown, r: PendingTransaction) => {
              const applyDate = dayjs(r.applyDate);
              const isWeekend = applyDate.day() === 0 || applyDate.day() === 6;
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
              let days = fund?.confirmDays || 1;
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
            render: () => <Tag color="orange">等待净值</Tag>,
          },
          {
            title: "操作",
            key: "action",
            render: (_: unknown, r: PendingTransaction) => (
              <Popconfirm
                title="确定撤销吗？"
                onConfirm={() => onDeletePending(r.id)}
              >
                <Button type="link" danger size="small">
                  撤销
                </Button>
              </Popconfirm>
            ),
          },
        ]}
        dataSource={pendingTransactions}
        rowKey="id"
        pagination={false}
        size="small"
      />
    </Card>
  );
}
