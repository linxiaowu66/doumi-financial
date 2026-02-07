import {
  Card,
  Space,
  Radio,
  Spin,
} from "antd";
import { LineChartOutlined } from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProfitChartProps {
  chartData: Array<{
    date: string;
    dailyProfit: number;
    cumulativeProfit: number;
    cumulativeProfitRate: number;
  }>;
  chartDays: number;
  chartLoading: boolean;
  isMobile: boolean;
  onChartDaysChange: (days: number) => void;
}

export default function ProfitChart({
  chartData,
  chartDays,
  chartLoading,
  isMobile,
  onChartDaysChange,
}: ProfitChartProps) {
  return (
    <Card
      title={
        <Space>
          <LineChartOutlined />
          <span>盈亏趋势</span>
        </Space>
      }
      style={{ marginBottom: isMobile ? 12 : 24 }}
      extra={
        <Radio.Group
          value={chartDays}
          onChange={(e) => onChartDaysChange(e.target.value)}
          size="small"
        >
          <Radio.Button value={30}>30天</Radio.Button>
          <Radio.Button value={180}>180天</Radio.Button>
          <Radio.Button value={365}>1年</Radio.Button>
        </Radio.Group>
      }
    >
      <Spin spinning={chartLoading}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                angle={isMobile ? -45 : 0}
                textAnchor={isMobile ? "end" : "middle"}
                height={isMobile ? 60 : 40}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{
                  value: "金额 (¥)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: isMobile ? 10 : 12 },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{
                  value: "收益率 (%)",
                  angle: 90,
                  position: "insideRight",
                  style: { fontSize: isMobile ? 10 : 12 },
                }}
              />
              <RechartsTooltip
                formatter={(
                  value: number,
                  name: string,
                  props: { dataKey?: string }
                ) => {
                  const dataKey = props.dataKey || name;
                  if (dataKey === "cumulativeProfitRate") {
                    return [`${value.toFixed(2)}%`, "累计收益率"];
                  }
                  if (dataKey === "dailyProfit") {
                    return [`¥${value.toLocaleString()}`, "每日盈亏"];
                  }
                  if (dataKey === "cumulativeProfit") {
                    return [`¥${value.toLocaleString()}`, "累计盈亏"];
                  }
                  return [`¥${value.toLocaleString()}`, name];
                }}
                labelFormatter={(label) => `日期: ${label}`}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="dailyProfit"
                stroke="#1890ff"
                strokeWidth={2}
                name="每日盈亏"
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeProfit"
                stroke="#52c41a"
                strokeWidth={2}
                name="累计盈亏"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativeProfitRate"
                stroke="#faad14"
                strokeWidth={2}
                name="累计收益率"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
            暂无数据
          </div>
        )}
      </Spin>
    </Card>
  );
}
