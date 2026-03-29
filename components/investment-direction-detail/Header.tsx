import { Card, Flex, Button, Typography, Space, Breadcrumb } from "antd";
import { ArrowLeftOutlined, PlusOutlined, FundOutlined, RobotOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InvestmentDirection } from "@/types/investment-direction-detail";

const { Title, Text } = Typography;

interface HeaderProps {
  direction: InvestmentDirection | null;
  isMobile: boolean;
  onOpenModal: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
}

export default function Header({
  direction,
  isMobile,
  onOpenModal,
  onAnalyze,
  analyzing,
}: HeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* 面包屑 - 移动端简化 */}
      {!isMobile && (
        <Breadcrumb
          items={[
            {
              title: <Link href="/investment-directions">投资方向</Link>,
            },
            {
              title: direction?.name || "加载中...",
            },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 顶部信息卡片 */}
      <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
        <Flex
          justify="space-between"
          align={isMobile ? "flex-start" : "center"}
          vertical={isMobile}
          gap={isMobile ? 12 : 0}
        >
          <div style={{ width: isMobile ? "100%" : "auto" }}>
            <Flex align="center" gap="middle" wrap="wrap">
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => router.push("/investment-directions")}
                size={isMobile ? "small" : "middle"}
              >
                返回
              </Button>
              <div>
                <Title
                  level={isMobile ? 4 : 2}
                  style={{ marginBottom: isMobile ? 4 : 8 }}
                >
                  <FundOutlined style={{ marginRight: 8 }} />
                  {direction?.name}
                </Title>
                {!isMobile && (
                  <Text type="secondary">{direction?.type === 'STOCK' ? '管理该投资方向下的股票' : '管理该投资方向下的基金'}</Text>
                )}
              </div>
            </Flex>
          </div>
          <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              icon={<RobotOutlined />}
              size={isMobile ? "small" : "middle"}
              onClick={onAnalyze}
              loading={analyzing}
              block={isMobile}
              style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', color: '#fff' }}
            >
              AI 账户分析
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size={isMobile ? "small" : "middle"}
              onClick={onOpenModal}
              block={isMobile}
            >
              {direction?.type === 'STOCK' ? '新建股票' : '新建基金'}
            </Button>
          </Space>
        </Flex>
      </Card>
    </>
  );
}
