import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Flex,
  Statistic,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { PlannedPurchase } from "@/types/fund";

const { Text } = Typography;

interface PlannedPurchaseListProps {
  plannedPurchases: PlannedPurchase[];
  isMobile: boolean;
  onPlanModalOpen: () => void;
  onDeletePlan: (id: number) => void;
  onOpenExecuteModal: (plan: PlannedPurchase) => void;
}

export default function PlannedPurchaseList({
  plannedPurchases,
  isMobile,
  onPlanModalOpen,
  onDeletePlan,
  onOpenExecuteModal,
}: PlannedPurchaseListProps) {
  if (plannedPurchases.length === 0) return null;

  return (
    <Card
      title={
        <Space wrap>
          <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
            计划买入
          </Text>
          <Tag color="orange">待执行</Tag>
        </Space>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={
        <Button
          type="primary"
          size={isMobile ? "small" : "small"}
          icon={<PlusOutlined />}
          onClick={onPlanModalOpen}
        >
          {isMobile ? "新建" : "新建计划"}
        </Button>
      }
    >
      <Space
        direction="vertical"
        style={{ width: "100%" }}
        size={isMobile ? "small" : "middle"}
      >
        {plannedPurchases.map((plan) => (
          <Card key={plan.id} size="small">
            {isMobile ? (
              // 移动端：垂直布局
              <div>
                <Flex
                  justify="space-between"
                  align="flex-start"
                  style={{ marginBottom: 12 }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#999",
                        marginBottom: 4,
                      }}
                    >
                      计划金额
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 500,
                        color: "#1890ff",
                      }}
                    >
                      ¥{Number(plan.plannedAmount).toLocaleString()}
                    </div>
                  </div>
                  <Popconfirm
                    title="确定要删除吗？"
                    onConfirm={() => onDeletePlan(plan.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      type="text"
                    />
                  </Popconfirm>
                </Flex>
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      marginBottom: 4,
                    }}
                  >
                    创建时间
                  </div>
                  <div style={{ fontSize: 12 }}>
                    {dayjs(plan.createdAt).format("YYYY-MM-DD")}
                  </div>
                </div>
                <Button
                  type="primary"
                  onClick={() => onOpenExecuteModal(plan)}
                  block
                  size={isMobile ? "small" : "middle"}
                >
                  执行买入
                </Button>
              </div>
            ) : (
              // 桌面端：水平布局
              <Flex justify="space-between" align="center">
                <Space size="large">
                  <Statistic
                    title="计划金额"
                    value={plan.plannedAmount}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ fontSize: 20 }}
                  />
                  <div>
                    <Text type="secondary">创建时间</Text>
                    <br />
                    <Text>{dayjs(plan.createdAt).format("YYYY-MM-DD")}</Text>
                  </div>
                </Space>
                <Space>
                  <Button
                    type="primary"
                    onClick={() => onOpenExecuteModal(plan)}
                  >
                    执行买入
                  </Button>
                  <Popconfirm
                    title="确定要删除吗？"
                    onConfirm={() => onDeletePlan(plan.id)}
                    okText="确定"
                    cancelText="取消"
                  >
                    <Button danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </Flex>
            )}
          </Card>
        ))}
      </Space>
    </Card>
  );
}
