"use client";

import { useState, useEffect } from "react";
import { Card, Button, Form, message, Flex, Typography } from "antd";
import { PlusOutlined, FundOutlined } from "@ant-design/icons";
import { InvestmentDirection, FundAlert } from "@/types/investment-direction";
import AlertsOverview from "@/components/investment-directions/AlertsOverview";
import StatsCard from "@/components/investment-directions/StatsCard";
import DirectionList from "@/components/investment-directions/DirectionList";
import DirectionModal from "@/components/investment-directions/DirectionModal";

const { Title, Text } = Typography;

export default function InvestmentDirectionsPage() {
  const [directions, setDirections] = useState<InvestmentDirection[]>([]);
  const [alerts, setAlerts] = useState<FundAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDirection, setEditingDirection] =
    useState<InvestmentDirection | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [form] = Form.useForm();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 加载投资方向列表
  const loadDirections = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/investment-directions");
      const data = await response.json();
      setDirections(data);
    } catch {
      message.error("加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 加载预警信息
  const loadAlerts = async () => {
    setAlertsLoading(true);
    try {
      const response = await fetch("/api/investment-directions/alerts");
      const data = await response.json();
      setAlerts(data);
    } catch {
      message.error("加载预警信息失败");
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    loadDirections();
    loadAlerts();
  }, []);

  // 打开新建/编辑弹窗
  const handleOpenModal = (direction?: InvestmentDirection) => {
    if (direction) {
      setEditingDirection(direction);
      form.setFieldsValue({
        name: direction.name,
        type: direction.type,
        expectedAmount: direction.expectedAmount,
      });
    } else {
      setEditingDirection(null);
      form.resetFields();
      form.setFieldsValue({ type: "FUND" });
    }
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (values: {
    name: string;
    type: "FUND" | "STOCK";
    expectedAmount: number;
  }) => {
    try {
      const url = editingDirection
        ? `/api/investment-directions/${editingDirection.id}`
        : "/api/investment-directions";

      const method = editingDirection ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(editingDirection ? "更新成功" : "创建成功");
        setModalOpen(false);
        form.resetFields();
        loadDirections();
      } else {
        message.error("操作失败");
      }
    } catch {
      message.error("操作失败");
    }
  };

  // 删除投资方向
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/investment-directions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("删除成功");
        loadDirections();
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("删除失败");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="mb-4 md:mb-6">
          <Flex
            justify="space-between"
            align={isMobile ? "flex-start" : "center"}
            vertical={isMobile}
            gap={isMobile ? 12 : 0}
          >
            <div>
              <Title level={isMobile ? 3 : 2} style={{ marginBottom: 8, marginTop: 0 }}>
                <FundOutlined className="mr-2 md:mr-3" />
                投资方向管理
              </Title>
              <Text type="secondary">
                管理您的投资账户，如海外长钱、稳钱账户、长钱账户等
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size={isMobile ? "middle" : "large"}
              onClick={() => handleOpenModal()}
              block={isMobile}
            >
              新建投资方向
            </Button>
          </Flex>
        </Card>

        <AlertsOverview alerts={alerts} loading={alertsLoading} />

        <StatsCard directions={directions} />

        <DirectionList
          directions={directions}
          loading={loading}
          isMobile={isMobile}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />

        <DirectionModal
          open={modalOpen}
          editingDirection={editingDirection}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          onFinish={handleSubmit}
          form={form}
        />
      </div>
    </div>
  );
}
