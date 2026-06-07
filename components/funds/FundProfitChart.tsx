"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, Radio, Spin, Empty, Typography, Button, message, Tooltip } from "antd";
import { TrophyOutlined, ReloadOutlined } from "@ant-design/icons";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from "recharts";

const { Text } = Typography;

interface ProfitPoint {
  date: string;
  dailyProfit: number;
  cumulativeProfit: number;
  cumulativeProfitRate: number;
  holdingCost: number;
  holdingValue: number;
  isNewHigh: boolean;
  isNewLow: boolean;
  // merged from transactions
  buyAmount?: number;
  sellAmount?: number;
}

interface TxRecord {
  id: number;
  type: string;
  amount: number;
  shares: number;
  price: number;
  date: string;
}

const DAYS_OPTIONS = [
  { label: "近90天", value: 90 },
  { label: "近180天", value: 180 },
  { label: "近365天", value: 365 },
  { label: "全部", value: 3650 },
];

// 自定义折线上的点：标记创新高（金色星）、创新低（紫色点）、买入（绿色三角）、卖出（红色倒三角）
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;

  if (payload.isNewHigh) {
    // 金色五角星
    const r = 8;
    const star = buildStar(cx, cy, 5, r, r * 0.45);
    return <polygon points={star} fill="#faad14" stroke="#d48806" strokeWidth={1} />;
  }
  if (payload.isNewLow) {
    // 紫色实心圆
    return <circle cx={cx} cy={cy} r={5} fill="#722ed1" stroke="#531dab" strokeWidth={1} />;
  }
  if (payload.buyAmount) {
    // 绿色上三角
    return (
      <polygon
        points={`${cx},${cy - 8} ${cx - 6},${cy + 4} ${cx + 6},${cy + 4}`}
        fill="#52c41a"
        stroke="#389e0d"
        strokeWidth={1}
      />
    );
  }
  if (payload.sellAmount) {
    // 红色下三角
    return (
      <polygon
        points={`${cx},${cy + 8} ${cx - 6},${cy - 4} ${cx + 6},${cy - 4}`}
        fill="#ff4d4f"
        stroke="#cf1322"
        strokeWidth={1}
      />
    );
  }
  return null;
};

function buildStar(cx: number, cy: number, n: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 2 * n; i++) {
    const angle = (i * Math.PI) / n - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ProfitPoint;
  if (!d) return null;

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 13,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        minWidth: 180,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, color: "#262626" }}>{label}</div>
      <div style={{ color: d.cumulativeProfit >= 0 ? "#52c41a" : "#ff4d4f" }}>
        累计盈亏：{d.cumulativeProfit >= 0 ? "+" : ""}¥{d.cumulativeProfit.toFixed(2)}
      </div>
      <div style={{ color: d.cumulativeProfitRate >= 0 ? "#52c41a" : "#ff4d4f" }}>
        累计收益率：{d.cumulativeProfitRate >= 0 ? "+" : ""}
        {d.cumulativeProfitRate.toFixed(2)}%
      </div>
      <div style={{ color: d.dailyProfit >= 0 ? "#52c41a" : "#ff4d4f" }}>
        当日盈亏：{d.dailyProfit >= 0 ? "+" : ""}¥{d.dailyProfit.toFixed(2)}
      </div>
      {d.holdingCost > 0 && (
        <div style={{ color: "#8c8c8c", marginTop: 4 }}>
          持仓成本：¥{d.holdingCost.toFixed(2)}
        </div>
      )}
      {d.holdingValue > 0 && (
        <div style={{ color: "#8c8c8c" }}>
          持仓市值：¥{d.holdingValue.toFixed(2)}
        </div>
      )}
      {d.buyAmount && (
        <div style={{ color: "#52c41a", marginTop: 4, fontWeight: 500 }}>
          ▲ 买入 ¥{d.buyAmount.toFixed(2)}
        </div>
      )}
      {d.sellAmount && (
        <div style={{ color: "#ff4d4f", marginTop: 4, fontWeight: 500 }}>
          ▼ 卖出 ¥{d.sellAmount.toFixed(2)}
        </div>
      )}
      {d.isNewHigh && (
        <div style={{ color: "#faad14", marginTop: 4, fontWeight: 500 }}>⭐ 创历史新高</div>
      )}
      {d.isNewLow && (
        <div style={{ color: "#722ed1", marginTop: 4, fontWeight: 500 }}>▼ 创历史新低</div>
      )}
    </div>
  );
};

interface FundProfitChartProps {
  fundId: number;
  isMobile?: boolean;
}

export default function FundProfitChart({ fundId, isMobile }: FundProfitChartProps) {
  const [data, setData] = useState<ProfitPoint[]>([]);
  const [days, setDays] = useState(365);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/funds/${fundId}/profit-history?days=${days}`);
      if (!res.ok) return;
      const json = await res.json();

      // 合并交易记录到历史点
      const txByDate: Record<string, { buyAmount: number; sellAmount: number }> = {};
      for (const tx of json.transactions as TxRecord[]) {
        if (!txByDate[tx.date]) txByDate[tx.date] = { buyAmount: 0, sellAmount: 0 };
        if (tx.type === "BUY") txByDate[tx.date].buyAmount += tx.amount;
        if (tx.type === "SELL") txByDate[tx.date].sellAmount += tx.amount;
      }

      const merged: ProfitPoint[] = (json.history as ProfitPoint[]).map((p) => ({
        ...p,
        buyAmount: txByDate[p.date]?.buyAmount || 0,
        sellAmount: txByDate[p.date]?.sellAmount || 0,
      }));

      setData(merged);
    } finally {
      setLoading(false);
    }
  }, [fundId, days]);

  useEffect(() => {
    load();
  }, [load]);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      const res = await fetch(`/api/funds/${fundId}/profit-history`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        message.success(`回填完成：${json.success} 条记录`);
        load();
      } else {
        message.error("回填失败");
      }
    } catch {
      message.error("回填失败");
    } finally {
      setBackfilling(false);
    }
  };

  const values = data.map((d) => d.cumulativeProfit);
  const minVal = values.length ? Math.min(...values) : 0;
  const maxVal = values.length ? Math.max(...values) : 0;
  const padding = (Math.abs(maxVal) + Math.abs(minVal)) * 0.12 || 10;
  const yMin = Math.floor(minVal - padding);
  const yMax = Math.ceil(maxVal + padding);

  // 收益线颜色：正为绿，负为红，混合用蓝
  const lineColor = minVal >= 0 ? "#52c41a" : maxVal <= 0 ? "#ff4d4f" : "#1890ff";

  return (
    <Card
      title={
        <span>
          <TrophyOutlined style={{ marginRight: 8, color: "#faad14" }} />
          盈亏历史
        </span>
      }
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Radio.Group
            size="small"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            optionType="button"
            options={DAYS_OPTIONS}
          />
          <Tooltip title="重新计算历史盈亏（以净值历史为基础）">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={backfilling}
              onClick={handleBackfill}
            >
              {isMobile ? "" : "回填"}
            </Button>
          </Tooltip>
        </div>
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
            <div>
              <Text type="secondary">暂无盈亏历史数据</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                请先确保有净值历史记录，然后点击「回填」按钮生成数据
              </Text>
            </div>
          }
          style={{ padding: "24px 0" }}
        >
          <Button loading={backfilling} onClick={handleBackfill} type="primary">
            立即回填
          </Button>
        </Empty>
      ) : (
        <>
          {/* 图例 */}
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 12,
              color: "#8c8c8c",
              marginBottom: 8,
              flexWrap: "wrap",
            }}
          >
            <span>
              <svg width={14} height={14} style={{ verticalAlign: "middle", marginRight: 4 }}>
                <polygon points="7,0 13,12 1,12" fill="#52c41a" />
              </svg>
              买入
            </span>
            <span>
              <svg width={14} height={14} style={{ verticalAlign: "middle", marginRight: 4 }}>
                <polygon points="7,14 13,2 1,2" fill="#ff4d4f" />
              </svg>
              卖出
            </span>
            <span>
              <svg width={14} height={14} style={{ verticalAlign: "middle", marginRight: 4 }}>
                <polygon points={buildStar(7, 7, 5, 7, 3)} fill="#faad14" />
              </svg>
              创新高
            </span>
            <span>
              <svg width={14} height={14} style={{ verticalAlign: "middle", marginRight: 4 }}>
                <circle cx={7} cy={7} r={5} fill="#722ed1" />
              </svg>
              创新低
            </span>
          </div>

          <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
            <ComposedChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                tick={{ fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => (v >= 0 ? `+${v.toFixed(0)}` : `${v.toFixed(0)}`)}
                width={64}
              />
              {/* 零线 */}
              <ReferenceLine y={0} stroke="#d9d9d9" strokeDasharray="4 2" />
              <RechartsTooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="cumulativeProfit"
                stroke={lineColor}
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 4, fill: lineColor }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  );
}
