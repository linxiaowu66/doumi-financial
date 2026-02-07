import { Card, Flex, Button, Typography, Space, Tag, Breadcrumb } from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fund, FundStats } from "@/types/fund";

const { Title, Text } = Typography;

interface FundHeaderProps {
  fund: Fund | null;
  stats: FundStats | null;
  isMobile: boolean;
  onOpenModal: (type: string) => void;
  onLiquidateAll: () => void;
  onPlanModalOpen: () => void;
}

export default function FundHeader({
  fund,
  stats,
  isMobile,
  onOpenModal,
  onLiquidateAll,
  onPlanModalOpen,
}: FundHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* 面包屑 - 移动端隐藏 */}
      {!isMobile && (
        <Breadcrumb
          items={[
            {
              title: <Link href="/investment-directions">投资方向</Link>,
            },
            {
              title: (
                <Link href={`/investment-directions/${fund?.direction.id}`}>
                  {fund?.direction.name}
                </Link>
              ),
            },
            {
              title: fund?.name || "加载中...",
            },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 顶部信息 */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Flex
          justify="space-between"
          align={isMobile ? "flex-start" : "center"}
          vertical={isMobile}
          gap={isMobile ? 12 : 0}
        >
          <Flex
            align="center"
            gap="middle"
            wrap="wrap"
            style={{ width: isMobile ? "100%" : "auto" }}
          >
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() =>
                router.push(`/investment-directions/${fund?.direction.id}`)
              }
              size={isMobile ? "small" : "middle"}
            >
              返回
            </Button>
            <div style={{ flex: isMobile ? 1 : "none" }}>
              <Title level={isMobile ? 4 : 2} style={{ marginBottom: 4 }}>
                {fund?.name}
              </Title>
              <Space wrap>
                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                  代码：{fund?.code}
                </Text>
                {fund?.category && <Tag color="blue">{fund.category}</Tag>}
              </Space>
            </div>
          </Flex>
          <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => onOpenModal("BUY")}
              size={isMobile ? "small" : "middle"}
              style={{ flex: isMobile ? 1 : "none" }}
            >
              买入
            </Button>
            <Button
              onClick={() => onOpenModal("SELL")}
              size={isMobile ? "small" : "middle"}
              style={{ flex: isMobile ? 1 : "none" }}
            >
              卖出
            </Button>
            {stats && stats.holdingShares > 0 && (
              <Button
                danger
                onClick={onLiquidateAll}
                size={isMobile ? "small" : "middle"}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                一键清仓
              </Button>
            )}
            <Button
              onClick={() => onOpenModal("DIVIDEND")}
              size={isMobile ? "small" : "middle"}
              style={{ flex: isMobile ? 1 : "none" }}
            >
              分红
            </Button>
            {!isMobile && (
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={onPlanModalOpen}
              >
                计划买入
              </Button>
            )}
          </Space>
        </Flex>
      </Card>
    </>
  );
}
