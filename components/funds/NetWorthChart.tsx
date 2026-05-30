"use client";

import { useEffect, useState } from "react";
import { Card, Radio, Spin, Empty, Typography } from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const { Text } = Typography;

interface NetWorthPoint {
  date: string;
  netWorth: number;
}

interface NetWorthChartProps {
  fundId: number;
  fundName: string;
  isMobile?: boolean;
}

const DAYS_OPTIONS = [
  { label: "近30天", value: 30 },
  { label: "近90天", value: 90 },
  { label: "近180天", value: 180 },
  { label: "近365天", value: 365 },
];

export default function NetWorthChart({ fundId, fundName, isMobile }: NetWorthChartProps) {
  const [data, setData] = useState<NetWorthPoint[]>([]);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/funds/${fundId}/net-worth-history?days=${days}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fundId, days]);

  const formatDate = (dateStr: string) => {
    // YYYY-MM-DD → MM-DD
    return dateStr.slice(5);
  };

  const minVal = data.length ? Math.min(...data.map((d) => d.netWorth)) : 0;
  const maxVal = data.length ? Math.max(...data.map((d) => d.netWorth)) : 0;
  const padding = (maxVal - minVal) * 0.1 || 0.01;
  const yMin = parseFloat((minVal - padding).toFixed(4));
  const yMax = parseFloat((maxVal + padding).toFixed(4));

  return (
    <Card
      title={
        <span>
          <LineChartOutlined style={{ marginRight: 8 }} />
          净值走势
        </span>
      }
      extra={
        <Radio.Group
          size="small"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          optionType="button"
          options={DAYS_OPTIONS}
        />
      }
      style={{ marginTop: 16 }}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin />
        </div>
      ) : data.length === 0 ? (
        <Empty
          description={
            <Text type="secondary">
              暂无历史净值数据，点击「刷新净值」后数据会逐日积累
            </Text>
          }
          style={{ padding: "24px 0" }}
        />
      ) : (
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v.toFixed(4)}
              width={60}
            />
            <Tooltip
              formatter={(value: number) => [`¥${value.toFixed(4)}`, "净值"]}
              labelFormatter={(label) => `日期：${label}`}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#1890ff"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
