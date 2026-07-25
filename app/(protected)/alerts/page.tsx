"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Card, Space, Spin, Tabs, Typography } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import AlertsOverview from "@/components/investment-directions/AlertsOverview";
import type { FundAlert } from "@/types/investment-direction";

const { Title, Text } = Typography;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<FundAlert[]>([]);
  const [directionId, setDirectionId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/investment-directions/alerts")
      .then((response) => response.json())
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  const directionOptions = useMemo(
    () => [
      { label: "全部投资方向", value: "all" },
      ...Array.from(
        new Map(
          alerts.map((alert) => [alert.directionId, alert.directionName]),
        ),
      ).map(([value, label]) => ({ label, value })),
    ],
    [alerts],
  );

  const visibleAlerts =
    directionId === "all"
      ? alerts
      : alerts.filter((alert) => alert.directionId === directionId);

  return (
    <div style={{ minHeight: "100vh", padding: "24px", background: "#f5f5f5" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                <WarningOutlined style={{ marginRight: 8 }} />资产预警
              </Title>
              <Text type="secondary">按投资方向和预警类型集中查看需要关注的资产变化</Text>
            </div>
            <Tabs
              activeKey={String(directionId)}
              onChange={(key) => setDirectionId(key === "all" ? "all" : Number(key))}
              items={directionOptions.map((option) => ({
                key: String(option.value),
                label: option.label,
              }))}
              tabBarStyle={{ marginBottom: 0, overflowX: "auto" }}
            />
          </Space>
        </Card>

        {loading ? (
          <Card style={{ textAlign: "center", padding: 32 }}><Spin /></Card>
        ) : visibleAlerts.length > 0 ? (
          <AlertsOverview alerts={visibleAlerts} loading={false} />
        ) : (
          <Alert type="success" message="当前没有需要关注的资产预警" showIcon />
        )}
      </div>
    </div>
  );
}
