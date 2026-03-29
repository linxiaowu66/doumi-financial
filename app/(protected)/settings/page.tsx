"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Calendar,
  message,
  Typography,
  Tag,
  Badge,
  Space,
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import {
  CalendarOutlined,
  InfoCircleOutlined,
  AimOutlined,
  PlusOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

interface Holiday {
  id: number;
  date: string;
  type: "HOLIDAY" | "WORKDAY";
  remark: string | null;
}

interface AnnualProfitTarget {
  id: number;
  year: number;
  targetAmount: number;
  actualAmount: number | null;
}

export default function SettingsPage() {
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [currentYear, setCurrentYear] = useState(dayjs().year());

  // Annual Targets State
  const [annualTargets, setAnnualTargets] = useState<AnnualProfitTarget[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingTarget, setEditingTarget] = useState<AnnualProfitTarget | null>(
    null,
  );

  const [systemSettings, setSystemSettings] = useState({
    stock_commission_rate: "0.1154",
    fund_commission_rate: "0.1",
    transfer_fee_rate: "0.01",
    stamp_duty_rate: "0.5",
  });

  // 加载节假日配置
  const loadHolidays = async (year: number) => {
    try {
      const response = await fetch(`/api/holidays?year=${year}`);
      const data = await response.json();

      const map = new Map<string, Holiday>();
      if (Array.isArray(data)) {
        data.forEach((h: any) => {
          const dateStr = dayjs(h.date).format("YYYY-MM-DD");
          map.set(dateStr, { ...h, date: dateStr });
        });
      }
      setHolidays(map);
    } catch (error) {
      console.error("加载节假日配置失败:", error);
      message.error("加载节假日配置失败");
    }
  };

  const loadSystemSettings = async () => {
    try {
      const response = await fetch("/api/settings/system");
      const data = await response.json();
      setSystemSettings((prev) => ({ ...prev, ...data }));
    } catch (e) {
      console.error("加载系统设置失败:", e);
    }
  };

  // 加载年度目标
  const loadAnnualTargets = async () => {
    try {
      const response = await fetch("/api/settings/annual-targets");
      const data = await response.json();
      if (Array.isArray(data)) {
        setAnnualTargets(data);
      }
    } catch (error) {
      console.error("加载年度目标失败:", error);
      message.error("加载年度目标失败");
    }
  };

  useEffect(() => {
    loadHolidays(currentYear);
    loadAnnualTargets();
    loadSystemSettings();
  }, [currentYear]);

  // 处理日期点击
  const onSelect = async (date: Dayjs) => {
    const dateStr = date.format("YYYY-MM-DD");
    const currentConfig = holidays.get(dateStr);
    // 判断是否为周末（周六=6, 周日=0）
    const isWeekend = date.day() === 0 || date.day() === 6;

    let nextType: "HOLIDAY" | "WORKDAY" | null = null;
    let method = "POST";

    if (currentConfig) {
      // 如果当前已有配置，点击则是取消配置（恢复默认）
      nextType = null;
      method = "DELETE";
    } else {
      // 如果当前无配置（默认状态），点击则是切换到相反状态
      if (isWeekend) {
        // 周末默认休息 -> 设置为调休工作日
        nextType = "WORKDAY";
      } else {
        // 工作日默认上班 -> 设置为节假日
        nextType = "HOLIDAY";
      }
    }

    try {
      if (method === "POST" && nextType) {
        const res = await fetch("/api/holidays", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: dateStr,
            type: nextType,
            remark: nextType === "HOLIDAY" ? "节假日" : "调休",
          }),
        });
        if (res.ok) {
          message.success(
            `已设置为${nextType === "HOLIDAY" ? "节假日" : "工作日"}`,
          );
          loadHolidays(date.year());
        } else {
          message.error("设置失败");
        }
      } else {
        const res = await fetch(`/api/holidays?date=${dateStr}`, {
          method: "DELETE",
        });
        if (res.ok) {
          message.success("已恢复默认设置");
          loadHolidays(date.year());
        } else {
          message.error("恢复默认失败");
        }
      }
    } catch (error) {
      console.error("操作失败:", error);
      message.error("操作失败");
    }
  };

  // 自定义日期单元格内容
  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const config = holidays.get(dateStr);

    // 如果有配置，显示标签
    if (config) {
      if (config.type === "HOLIDAY") {
        return <Tag color="error">休</Tag>;
      } else if (config.type === "WORKDAY") {
        return <Tag color="processing">班</Tag>;
      }
    }

    return null;
  };

  // 年度目标操作
  const showModal = (target?: AnnualProfitTarget) => {
    setEditingTarget(target || null);
    if (target) {
      form.setFieldsValue({
        year: target.year,
        targetAmount: target.targetAmount,
      });
    } else {
      form.setFieldsValue({
        year: dayjs().year(),
        targetAmount: 0,
      });
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
    setEditingTarget(null);
  };

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/settings/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(systemSettings),
      });
      if (res.ok) message.success("费率设置已保存");
    } catch {
      message.error("保存失败");
    }
  };

  const handleSaveTarget = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch("/api/settings/annual-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("保存成功");
        setIsModalVisible(false);
        form.resetFields();
        loadAnnualTargets();
      } else {
        message.error("保存失败");
      }
    } catch (error) {
      console.error("保存失败:", error);
    }
  };

  const targetColumns = [
    {
      title: "年份",
      dataIndex: "year",
      key: "year",
      render: (text: number) => <Tag color="blue">{text}年</Tag>,
    },
    {
      title: "目标盈利金额",
      dataIndex: "targetAmount",
      key: "targetAmount",
      render: (amount: string | number) => (
        <Text strong>
          ¥{" "}
          {Number(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </Text>
      ),
    },
    {
      title: "实际盈利金额",
      dataIndex: "actualAmount",
      key: "actualAmount",
      render: (amount: string | number | null) => (
        <Text type={amount && Number(amount) < 0 ? "danger" : "success"} strong>
          {amount !== null
            ? `¥ ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : "-"}
        </Text>
      ),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: AnnualProfitTarget) => (
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => showModal(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f5f5f5" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <Title level={2} style={{ marginBottom: 24 }}>
          系统设置
        </Title>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card
              title={
                <>
                  <CalendarOutlined /> 节假日配置
                </>
              }
              extra={
                <Space>
                  <InfoCircleOutlined style={{ color: "#1890ff" }} />
                  <Text type="secondary">点击日期切换状态</Text>
                </Space>
              }
            >
              <div
                style={{
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Space size="middle">
                  <Badge color="red" text="节假日" />
                  <Badge color="blue" text="调休" />
                  <Badge status="default" text="默认" />
                </Space>
              </div>

              <Calendar
                onPanelChange={(value) => setCurrentYear(value.year())}
                dateCellRender={dateCellRender}
                onSelect={onSelect}
                fullscreen={false}
              />
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              title={
                <>
                  <InfoCircleOutlined /> 交易费率设置 (千分之)
                </>
              }
              extra={
                <Button type="primary" onClick={handleSaveSettings}>
                  保存
                </Button>
              }
              style={{ marginBottom: 16 }}
            >
              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="股票基础佣金率 (‰)">
                      <InputNumber
                        value={Number(systemSettings.stock_commission_rate)}
                        onChange={(val) =>
                          setSystemSettings((p) => ({
                            ...p,
                            stock_commission_rate: String(val),
                          }))
                        }
                        step={0.01}
                        precision={4}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="场内基金佣金率 (‰)">
                      <InputNumber
                        value={Number(systemSettings.fund_commission_rate)}
                        onChange={(val) =>
                          setSystemSettings((p) => ({
                            ...p,
                            fund_commission_rate: String(val),
                          }))
                        }
                        step={0.01}
                        precision={4}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="过户费率 (‰)">
                      <InputNumber
                        value={Number(systemSettings.transfer_fee_rate)}
                        onChange={(val) =>
                          setSystemSettings((p) => ({
                            ...p,
                            transfer_fee_rate: String(val),
                          }))
                        }
                        step={0.01}
                        precision={4}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="印花税率 (‰) - 仅卖出">
                      <InputNumber
                        value={Number(systemSettings.stamp_duty_rate)}
                        onChange={(val) =>
                          setSystemSettings((p) => ({
                            ...p,
                            stamp_duty_rate: String(val),
                          }))
                        }
                        step={0.01}
                        precision={4}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>

            <Card
              title={
                <>
                  <AimOutlined /> 年度盈利目标
                </>
              }
              extra={
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => showModal()}
                >
                  添加目标
                </Button>
              }
            >
              <Table
                dataSource={annualTargets}
                columns={targetColumns}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Modal
        title={editingTarget ? "编辑年度盈利目标" : "添加年度盈利目标"}
        open={isModalVisible}
        onOk={handleSaveTarget}
        onCancel={handleCancel}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="year"
            label="年份"
            rules={[{ required: true, message: "请输入年份" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="如：2025"
              min={2000}
              max={2100}
              disabled={!!editingTarget} // 编辑时不可修改年份
            />
          </Form.Item>
          <Form.Item
            name="targetAmount"
            label="目标盈利金额 (¥)"
            rules={[{ required: true, message: "请输入目标盈利金额" }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              placeholder="输入目标金额"
              precision={2}
              step={1000}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
