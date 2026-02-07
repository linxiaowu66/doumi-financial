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
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { CalendarOutlined, InfoCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

interface Holiday {
  id: number;
  date: string;
  type: "HOLIDAY" | "WORKDAY";
  remark: string | null;
}

export default function SettingsPage() {
  const [holidays, setHolidays] = useState<Map<string, Holiday>>(new Map());
  const [currentYear, setCurrentYear] = useState(dayjs().year());

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

  useEffect(() => {
    loadHolidays(currentYear);
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
          message.success(`已设置为${nextType === "HOLIDAY" ? "节假日" : "工作日"}`);
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

  return (
    <div style={{ padding: "24px", minHeight: "100vh", background: "#f5f5f5" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <Title level={2} style={{ marginBottom: 24 }}>
          <CalendarOutlined /> 系统设置
        </Title>
        
        <Card 
            title="节假日配置" 
            extra={
                <Space>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <Text type="secondary">点击日期可在“默认”、“节假日”、“调休工作日”之间切换</Text>
                </Space>
            }
        >
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
            <Space size="large">
              <Badge color="red" text="节假日 (HOLIDAY)" />
              <Badge color="blue" text="调休工作日 (WORKDAY)" />
              <Badge status="default" text="默认 (周末休，周一至五班)" />
            </Space>
          </div>
          
          <Calendar 
            onPanelChange={(value) => setCurrentYear(value.year())}
            dateCellRender={dateCellRender}
            onSelect={onSelect}
            fullscreen={false} 
          />
        </Card>
      </div>
    </div>
  );
}
