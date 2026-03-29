import { Card, Flex, Button, Typography, Space, Breadcrumb } from "antd";
import { ArrowLeftOutlined, PlusOutlined, FundOutlined, RobotOutlined } from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInvestmentConfig } from "@/hooks/use-investment-config";

const { Title, Text } = Typography;

interface HeaderProps {
  direction: any;
  analyzing: boolean;
  onAnalyze: () => void;
  onOpenModal: () => void;
  isMobile: boolean;
}

export default function Header({
  direction,
  analyzing,
  onAnalyze,
  onOpenModal,
  isMobile,
}: HeaderProps) {
  const router = useRouter();
  const { assetLabel } = useInvestmentConfig(direction?.type);

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
              title: direction?.name || "加载中...",
            },
          ]}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card className="mb-4 md:mb-6">
        <Flex
          justify="space-between"
          align={isMobile ? "flex-start" : "center"}
          vertical={isMobile}
          gap={isMobile ? 12 : 0}
        >
          <div style={{ flex: 1 }}>
            <Flex align="center" gap="middle">
              {!isMobile && (
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => router.push("/investment-directions")}
                />
              )}
              <div>
                <Title
                  level={isMobile ? 4 : 2}
                  style={{ marginBottom: isMobile ? 4 : 8, marginTop: 0 }}
                >
                  <FundOutlined style={{ marginRight: 8 }} />
                  {direction?.name}
                </Title>
                {!isMobile && (
                  <Text type="secondary">管理该投资方向下的{assetLabel}</Text>
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
              新建{assetLabel}
            </Button>
          </Space>
        </Flex>
      </Card>
    </>
  );
}
