"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Flex,
  Typography,
  Space,
  Popconfirm,
  Statistic,
  Row,
  Col,
  Tag,
  Breadcrumb,
  Divider,
  Radio,
  Spin,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FundOutlined,
  DollarOutlined,
  LineChartOutlined,
  QuestionCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
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

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Transaction {
  id: number;
  type: string;
  date: string;
  price: number;
  amount?: number;
  shares?: number;
  fee?: number;
  dividendReinvest?: boolean;
  remark?: string | null;
  fund?: {
    id: number;
    name: string;
    code: string;
  };
}

interface ExtendedTransaction extends Transaction {
  fundId: number;
  fundName: string;
  fundCode: string;
}

interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
  latestNetWorth?: number | null;
  netWorthDate?: string | null;
  createdAt: string;
  transactions?: Transaction[];
  _count?: {
    transactions: number;
    plannedPurchases: number;
  };
}

interface FundAlert {
  fundId: number;
  fundName: string;
  reason: "days" | "price" | "position"; // days: 超过30天, price: 下跌超过5%, position: 仓位超标
  daysSinceLastBuy?: number;
  priceDropPercent?: number;
  positionExcessPercent?: number; // 仓位超标百分比
}

interface CategoryPositionAlert {
  categoryName: string;
  currentValue: number; // 当前市值（持仓成本 + 持仓收益）
  targetAmount: number; // 目标金额
  excessPercent: number; // 超标百分比
}

interface InvestmentDirection {
  id: number;
  name: string;
  expectedAmount: number;
  actualAmount: number;
}

interface FundStats {
  fundId: number;
  holdingShares: number;
  holdingCost: number;
  avgCostPrice: number;
  holdingValue?: number; // 持仓市值
  holdingProfit?: number; // 持仓收益
  holdingProfitRate: number; // 持仓收益率
  totalProfitRate: number; // 累计收益率
  totalProfit: number; // 累计收益金额
  totalDividend: number;
  transactionCount: number;
}

interface CategoryTarget {
  id: number;
  directionId: number;
  categoryName: string;
  targetPercent: number; // 目标仓位百分比（0-100）
}

interface DirectionSummary {
  totalInvested: string;
  totalCurrentValue: string;
  totalCost: string;
  holdingProfit: string;
  totalSellProfit: string;
  totalDividendCash: string;
  totalDividendReinvest: string;
  totalProfit: string;
  totalProfitRate: string;
  fundCount: number;
}

export default function DirectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const directionId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [direction, setDirection] = useState<InvestmentDirection | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [fundsStats, setFundsStats] = useState<Map<number, FundStats>>(
    new Map()
  );
  const [categoryTargets, setCategoryTargets] = useState<CategoryTarget[]>([]);
  const [summary, setSummary] = useState<DirectionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [form] = Form.useForm();
  const [targetForm] = Form.useForm();
  const [chartData, setChartData] = useState<
    Array<{
      date: string;
      dailyProfit: number;
      cumulativeProfit: number;
      cumulativeProfitRate: number;
    }>
  >([]);
  const [chartDays, setChartDays] = useState<number>(30);
  const [chartLoading, setChartLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [categorySearchValue, setCategorySearchValue] = useState<string>("");
  const [categoryAlerts, setCategoryAlerts] = useState<
    Map<string, FundAlert[]>
  >(new Map());
  const [categoryPositionAlerts, setCategoryPositionAlerts] = useState<
    Map<string, CategoryPositionAlert>
  >(new Map());

  // 处理负数零的工具函数
  // 使用更大的阈值（0.01），确保接近0的值都被归一化
  const normalizeZero = (value: number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    return Math.abs(value) < 0.01 ? 0 : value;
  };

  // 判断基金是否清仓
  const isFundLiquidated = (stats: FundStats | undefined): boolean => {
    if (!stats) return false;
    const shares = normalizeZero(stats.holdingShares);
    const cost = normalizeZero(stats.holdingCost || 0);
    const value = normalizeZero(stats.holdingValue || 0);
    // 清仓条件：持仓份额为0，且持仓成本为0，且持仓市值为0
    return shares === 0 && cost === 0 && value === 0;
  };

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 保存和恢复滚动位置
  useEffect(() => {
    const scrollKey = `scroll-position-${directionId}`;

    // 恢复滚动位置 - 等待数据加载完成
    const savedScrollPosition = sessionStorage.getItem(scrollKey);
    if (savedScrollPosition && !loading) {
      // 延迟恢复，确保页面内容已渲染
      const timer = setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [directionId, loading, funds.length]);

  // 监听滚动事件，保存滚动位置
  useEffect(() => {
    const scrollKey = `scroll-position-${directionId}`;

    const handleScroll = () => {
      sessionStorage.setItem(scrollKey, window.scrollY.toString());
    };

    // 使用节流优化性能
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
    };
  }, [directionId]);

  // 加载投资方向详情
  const loadDirection = useCallback(async () => {
    try {
      const response = await fetch(`/api/investment-directions/${directionId}`);
      const data = await response.json();
      setDirection(data);
    } catch {
      message.error("加载投资方向失败");
    }
  }, [directionId]);

  // 加载分类目标
  const loadCategoryTargets = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/category-targets?directionId=${directionId}`
      );
      if (!response.ok) {
        console.error(
          "加载分类目标失败:",
          response.status,
          response.statusText
        );
        setCategoryTargets([]);
        return;
      }
      const data = await response.json();
      // 确保 data 是数组
      if (Array.isArray(data)) {
        setCategoryTargets(data);
      } else {
        console.error("分类目标数据格式错误:", data);
        setCategoryTargets([]);
      }
    } catch (error) {
      console.error("加载分类目标失败:", error);
      setCategoryTargets([]);
    }
  }, [directionId]);

  // 加载汇总统计
  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/investment-directions/${directionId}/summary`
      );
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("加载汇总统计失败:", error);
    }
  }, [directionId]);

  // 检查基金提醒条件（按分类检查）
  const checkFundAlerts = useCallback(
    (fundsData: Fund[], statsMap: Map<number, FundStats>) => {
      const alertsMap = new Map<string, FundAlert[]>();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 按分类分组
      const groupedByCategory = fundsData.reduce((acc, fund) => {
        if (!fund.category) return acc;
        if (!acc[fund.category]) {
          acc[fund.category] = [];
        }
        acc[fund.category].push(fund);
        return acc;
      }, {} as Record<string, Fund[]>);

      // 检查每个分类
      Object.entries(groupedByCategory).forEach(([category, categoryFunds]) => {
        // 找到该分类下所有基金的最后一次买入交易
        let categoryLastBuyDate: Date | null = null;

        categoryFunds.forEach((fund) => {
          if (!fund.transactions || fund.transactions.length === 0) {
            return;
          }

          // 找到该基金的最后一次买入交易
          const buyTransactions = fund.transactions.filter(
            (tx) => tx.type === "BUY"
          );
          if (buyTransactions.length === 0) {
            return;
          }

          // 按日期排序，获取最后一次买入
          const lastBuy = buyTransactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

          const lastBuyDate = new Date(lastBuy.date);
          lastBuyDate.setHours(0, 0, 0, 0);

          // 更新分类的最后买入时间（取最近的那次）
          if (!categoryLastBuyDate || lastBuyDate > categoryLastBuyDate) {
            categoryLastBuyDate = lastBuyDate;
          }
        });

        // 如果分类下没有任何买入交易，跳过
        if (!categoryLastBuyDate) {
          return;
        }

        // 计算分类距离上次买入的天数
        const daysDiff = Math.floor(
          (today.getTime() - categoryLastBuyDate.getTime()) /
            (1000 * 60 * 60 * 24)
        );

        // 检查条件1：分类距离上次买入超过30天
        const condition1 = daysDiff > 30;

        // 检查条件2：检查该分类下每个基金的净值下跌情况（使用每个基金自己的最后买入价格）
        categoryFunds.forEach((fund) => {
          if (!fund.transactions || fund.transactions.length === 0) {
            return;
          }

          // 找到该基金的最后一次买入交易
          const buyTransactions = fund.transactions.filter(
            (tx) => tx.type === "BUY"
          );
          if (buyTransactions.length === 0) {
            return;
          }

          const lastBuy = buyTransactions.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];

          let condition2 = false;
          let priceDropPercent = 0;

          if (fund.latestNetWorth && lastBuy.price) {
            const currentPrice = parseFloat(fund.latestNetWorth.toString());
            const buyPrice = parseFloat(lastBuy.price.toString());
            priceDropPercent = ((buyPrice - currentPrice) / buyPrice) * 100;
            condition2 = priceDropPercent > 5;
          }

          // 如果满足条件2（净值下跌），添加到提醒列表
          if (condition2) {
            if (!alertsMap.has(category)) {
              alertsMap.set(category, []);
            }
            alertsMap.get(category)!.push({
              fundId: fund.id,
              fundName: fund.name,
              reason: "price",
              priceDropPercent: priceDropPercent,
            });
          }
        });

        // 如果满足条件1（分类超过30天未买入），添加到提醒列表
        // 但是，如果仓位已经超过100%，就不需要提示了
        if (condition1) {
          // 检查该分类的仓位是否已经超过100%
          const categoryTarget = categoryTargets.find(
            (t) => t.categoryName === category
          );
          const targetPercent = categoryTarget?.targetPercent || 0;

          if (targetPercent > 0 && direction?.expectedAmount) {
            const targetAmount =
              (Number(direction.expectedAmount) * targetPercent) / 100;

            // 计算当前市值（持仓成本 + 持仓收益）
            let currentValue = 0;
            categoryFunds.forEach((fund) => {
              const stats = statsMap.get(fund.id);
              if (stats) {
                const holdingProfit =
                  (stats.holdingCost * stats.holdingProfitRate) / 100;
                currentValue += stats.holdingCost + holdingProfit;
              }
            });

            // 如果当前市值已经超过目标金额的100%，就不显示未买入提示
            const positionPercent =
              targetAmount > 0 ? (currentValue / targetAmount) * 100 : 0;

            if (positionPercent >= 100) {
              // 仓位已经超过100%，不需要提示未买入
              return;
            }
          }

          if (!alertsMap.has(category)) {
            alertsMap.set(category, []);
          }
          // 为该分类添加一个通用的提醒，不针对特定基金
          alertsMap.get(category)!.push({
            fundId: 0, // 0 表示分类级别的提醒
            fundName: category,
            reason: "days",
            daysSinceLastBuy: daysDiff,
          });
        }
      });

      setCategoryAlerts(alertsMap);
    },
    [direction, categoryTargets]
  );

  // 使用 ref 存储函数引用，避免循环依赖
  const checkFundAlertsRef = useRef(checkFundAlerts);
  checkFundAlertsRef.current = checkFundAlerts;

  // 检查分类仓位超标提醒
  const checkCategoryPositionAlerts = useCallback(
    (fundsData: Fund[], statsMap: Map<number, FundStats>) => {
      const positionAlertsMap = new Map<string, CategoryPositionAlert>();

      if (!direction?.expectedAmount) {
        return;
      }

      // 按分类分组
      const groupedByCategory = fundsData.reduce((acc, fund) => {
        if (!fund.category) return acc;
        if (!acc[fund.category]) {
          acc[fund.category] = [];
        }
        acc[fund.category].push(fund);
        return acc;
      }, {} as Record<string, Fund[]>);

      // 检查每个分类
      Object.entries(groupedByCategory).forEach(([category, categoryFunds]) => {
        const categoryTarget = categoryTargets.find(
          (t) => t.categoryName === category
        );
        const targetPercent = categoryTarget?.targetPercent || 0;

        if (targetPercent <= 0) {
          return; // 没有设置目标，不检查
        }

        // 计算目标金额
        const targetAmount =
          (Number(direction.expectedAmount) * targetPercent) / 100;

        // 计算当前市值（持仓成本 + 持仓收益）
        let currentValue = 0;
        categoryFunds.forEach((fund) => {
          const stats = statsMap.get(fund.id);
          if (stats) {
            // 当前市值 = 持仓成本 + 持仓收益
            // 持仓收益 = 持仓成本 * 持仓收益率 / 100
            const holdingProfit =
              (stats.holdingCost * stats.holdingProfitRate) / 100;
            currentValue += stats.holdingCost + holdingProfit;
          }
        });

        // 检查是否超过目标仓位的110%（即超过10%）
        if (targetAmount > 0 && currentValue > targetAmount * 1.1) {
          const excessPercent =
            ((currentValue - targetAmount) / targetAmount) * 100;
          positionAlertsMap.set(category, {
            categoryName: category,
            currentValue,
            targetAmount,
            excessPercent,
          });
        }
      });

      setCategoryPositionAlerts(positionAlertsMap);
    },
    [direction, categoryTargets]
  );

  // 使用 ref 存储函数引用，避免循环依赖
  const checkCategoryPositionAlertsRef = useRef(checkCategoryPositionAlerts);
  checkCategoryPositionAlertsRef.current = checkCategoryPositionAlerts;

  // 加载基金列表
  const loadFunds = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/funds?directionId=${directionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFunds(data);

      // 提取已有的分类列表（去重，过滤空值）
      const categories = Array.from(
        new Set(
          data
            .map((fund: Fund) => fund.category)
            .filter((cat: string | null) => cat && cat.trim() !== "")
        )
      ) as string[];
      setCategoryOptions(
        categories.sort().map((cat) => ({ label: cat, value: cat }))
      );

      // 加载每个基金的统计信息
      const statsMap = new Map<number, FundStats>();
      await Promise.all(
        data.map(async (fund: Fund) => {
          try {
            const statsRes = await fetch(
              `/api/funds/${fund.id}/stats${
                fund.latestNetWorth
                  ? `?currentPrice=${encodeURIComponent(
                      fund.latestNetWorth.toString()
                    )}`
                  : ""
              }`
            );
            const stats = await statsRes.json();
            statsMap.set(fund.id, stats);
          } catch (err) {
            console.error(`加载基金${fund.id}统计失败:`, err);
          }
        })
      );
      setFundsStats(statsMap);

      // 检查提醒条件（需要传入 statsMap 以计算仓位）
      if (checkFundAlertsRef.current) {
        try {
          checkFundAlertsRef.current(data, statsMap);
        } catch (err) {
          console.error("检查基金提醒失败:", err);
        }
      }
      // 检查仓位超标提醒
      if (checkCategoryPositionAlertsRef.current) {
        try {
          checkCategoryPositionAlertsRef.current(data, statsMap);
        } catch (err) {
          console.error("检查仓位超标提醒失败:", err);
        }
      }
    } catch (error) {
      console.error("加载基金列表失败:", error);
      message.error("加载基金列表失败");
    } finally {
      setLoading(false);
    }
  }, [directionId]);

  // 加载图表数据
  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    try {
      const response = await fetch(
        `/api/investment-directions/${directionId}/daily-profit?days=${chartDays}`
      );
      const data = await response.json();
      if (response.ok && data.data) {
        setChartData(data.data);
      } else {
        console.error("加载图表数据失败:", data.error);
        message.warning(data.error || "加载图表数据失败");
      }
    } catch (error) {
      console.error("加载图表数据失败:", error);
      message.error("加载图表数据失败");
    } finally {
      setChartLoading(false);
    }
  }, [directionId, chartDays]);

  useEffect(() => {
    loadDirection();
    loadFunds();
    loadCategoryTargets();
    loadSummary();
    loadChartData();
  }, [
    directionId,
    loadDirection,
    loadFunds,
    loadCategoryTargets,
    loadSummary,
    loadChartData,
  ]);

  // 当基金统计或分类目标变化时，重新检查仓位超标
  useEffect(() => {
    if (
      funds.length > 0 &&
      fundsStats.size > 0 &&
      categoryTargets.length >= 0 &&
      direction
    ) {
      checkCategoryPositionAlerts(funds, fundsStats);
    }
  }, [
    funds,
    fundsStats,
    categoryTargets,
    direction,
    checkCategoryPositionAlerts,
  ]);

  // 打开新建/编辑弹窗
  const handleOpenModal = (fund?: Fund) => {
    if (fund) {
      setEditingFund(fund);
      form.setFieldsValue({
        code: fund.code,
        name: fund.name,
        category: fund.category,
        remark: fund.remark,
      });
    } else {
      setEditingFund(null);
      form.resetFields();
    }
    setCategorySearchValue("");
    setModalOpen(true);
  };

  // 提交表单
  const handleSubmit = async (values: {
    code: string;
    name: string;
    category?: string;
    remark?: string;
  }) => {
    try {
      const url = editingFund ? `/api/funds/${editingFund.id}` : "/api/funds";
      const method = editingFund ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          directionId,
        }),
      });

      if (response.ok) {
        message.success(editingFund ? "更新成功" : "创建成功");
        setModalOpen(false);
        form.resetFields();
        loadFunds();
      } else {
        message.error("操作失败");
      }
    } catch {
      message.error("操作失败");
    }
  };

  // 删除基金
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/funds/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("删除成功");
        loadFunds();
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("删除失败");
    }
  };

  // 打开设置分类目标弹窗
  const handleOpenTargetModal = (
    categoryName: string,
    currentTargetPercent?: number
  ) => {
    setEditingCategory(categoryName);
    targetForm.setFieldsValue({
      targetPercent: currentTargetPercent || 0,
    });
    setTargetModalOpen(true);
  };

  // 保存分类目标
  const handleSaveTarget = async (values: { targetPercent: number }) => {
    try {
      const response = await fetch("/api/category-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directionId,
          categoryName: editingCategory,
          targetPercent: values.targetPercent,
        }),
      });

      if (response.ok) {
        message.success("目标仓位设置成功");
        setTargetModalOpen(false);
        targetForm.resetFields();
        loadCategoryTargets();
      } else {
        const errorData = await response.json();
        message.error(errorData.error || "设置失败");
      }
    } catch {
      message.error("设置失败");
    }
  };

  // 按分类分组
  const groupedFunds = funds.reduce((groups, fund) => {
    const category = fund.category || "未分类";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(fund);
    return groups;
  }, {} as Record<string, Fund[]>);

  const columns = [
    {
      title: "基金代码",
      dataIndex: "code",
      key: "code",
      width: 90,
    },
    {
      title: "基金名称",
      dataIndex: "name",
      key: "name",
      width: 180,
      ellipsis: true,
      render: (text: string, record: Fund) => {
        const stats = fundsStats.get(record.id);
        const isLiquidated = isFundLiquidated(stats);
        return (
          <Flex align="center" gap="small" style={{ width: "100%" }}>
            <Text
              strong
              style={{
                maxWidth: record.remark || isLiquidated ? "120px" : "160px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "inline-block",
              }}
              title={text}
            >
              {text}
            </Text>
            {isLiquidated && (
              <Tag
                color="red"
                style={{
                  fontSize: 12,
                  flexShrink: 0,
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                已清仓
              </Tag>
            )}
            {record.remark && (
              <Tag
                color="blue"
                style={{ fontSize: 12, flexShrink: 0, margin: 0 }}
              >
                有备注
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: (
        <Space>
          持仓收益率
          <Tooltip title="(当前市值 - 持仓成本) ÷ 持仓成本 × 100%，反映当前持仓的收益率">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "holdingProfitRate",
      align: "right" as const,
      width: 110,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.holdingProfitRate && stats?.holdingProfitRate !== 0) {
          return "-";
        }
        const rate = stats.holdingProfitRate;
        const color = rate >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? "+" : ""}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: (
        <Space>
          累计收益率
          <Tooltip title="累计总收益 ÷ 总投入 × 100%，包括持仓收益、卖出收益和分红">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "totalProfitRate",
      align: "right" as const,
      width: 110,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfitRate && stats?.totalProfitRate !== 0) {
          return "-";
        }
        const rate = stats.totalProfitRate;
        const color = rate >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {rate >= 0 ? "+" : ""}
            {rate.toFixed(2)}%
          </span>
        );
      },
    },
    {
      title: (
        <Space>
          累计收益金额
          <Tooltip title="持仓收益 + 卖出收益 + 分红的总和，反映该基金的整体盈亏">
            <QuestionCircleOutlined
              style={{ color: "#1890ff", cursor: "help", fontSize: 12 }}
            />
          </Tooltip>
        </Space>
      ),
      key: "totalProfit",
      align: "right" as const,
      width: 120,
      render: (_: unknown, record: Fund) => {
        const stats = fundsStats.get(record.id);
        if (!stats?.totalProfit && stats?.totalProfit !== 0) {
          return "-";
        }
        const profit = stats.totalProfit;
        const color = profit >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿
        return (
          <span style={{ color }}>
            {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
          </span>
        );
      },
    },
    {
      title: "交易记录",
      key: "transactions",
      align: "center" as const,
      width: 85,
      render: (_: unknown, record: Fund) => record._count?.transactions || 0,
    },
    {
      title: "待买入",
      key: "planned",
      align: "center" as const,
      width: 80,
      render: (_: unknown, record: Fund) => {
        const count = record._count?.plannedPurchases || 0;
        return count > 0 ? <Tag color="orange">{count}</Tag> : 0;
      },
    },
    {
      title: "操作",
      key: "action",
      align: "center" as const,
      width: 110,
      fixed: "right" as const,
      render: (_: unknown, record: Fund) => (
        <Space>
          <Button
            type="link"
            icon={<LineChartOutlined />}
            onClick={() => {
              // 保存滚动位置
              const scrollKey = `scroll-position-${directionId}`;
              sessionStorage.setItem(scrollKey, window.scrollY.toString());
              router.push(`/funds/${record.id}`);
            }}
            size="small"
            title="详情"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
            size="small"
            title="编辑"
          />
          <Popconfirm
            title="确定要删除吗？"
            description="删除后该基金的所有交易记录也会被删除"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
              title="删除"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 计算总计
  const totalHoldingCost = Array.from(fundsStats.values()).reduce(
    (sum, stats) => sum + stats.holdingCost,
    0
  );

  // 移动端基金卡片渲染
  const renderMobileFundCard = (fund: Fund) => {
    const stats = fundsStats.get(fund.id);
    return (
      <Card
        key={fund.id}
        size="small"
        style={{ marginBottom: 12 }}
        onClick={() => {
          // 保存滚动位置
          const scrollKey = `scroll-position-${directionId}`;
          sessionStorage.setItem(scrollKey, window.scrollY.toString());
          router.push(`/funds/${fund.id}`);
        }}
      >
        <div style={{ marginBottom: 8 }}>
          <Flex justify="space-between" align="flex-start">
            <div style={{ flex: 1 }}>
              <Flex align="center" gap="small" wrap="wrap">
                <Text strong style={{ fontSize: 14 }}>
                  {fund.name}
                </Text>
                {isFundLiquidated(stats) && (
                  <Tag
                    color="red"
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      margin: 0,
                    }}
                  >
                    已清仓
                  </Tag>
                )}
              </Flex>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {fund.code}
              </Text>
            </div>
            <Space size="small">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal(fund);
                }}
              />
              <Popconfirm
                title="确定要删除吗？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDelete(fund.id);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Space>
          </Flex>
        </div>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>持仓成本</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#1890ff" }}>
              ¥{stats?.holdingCost?.toLocaleString() || "-"}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>持仓份额</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {stats?.holdingShares?.toLocaleString() || "-"}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>交易记录</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.transactions || 0} 笔
            </div>
          </Col>
          <Col span={12}>
            <div style={{ fontSize: 12, color: "#999" }}>待买入</div>
            <div style={{ fontSize: 14 }}>
              {fund._count?.plannedPurchases ? (
                <Tag color="orange">{fund._count.plannedPurchases}</Tag>
              ) : (
                "0"
              )}
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: isMobile ? "8px" : "32px",
        background: "#f5f5f5",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
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
                    <Text type="secondary">管理该投资方向下的基金</Text>
                  )}
                </div>
              </Flex>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size={isMobile ? "small" : "middle"}
              onClick={() => handleOpenModal()}
              block={isMobile}
            >
              新建基金
            </Button>
          </Flex>
        </Card>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title="基金数量"
                value={funds.length}
                suffix="个"
                prefix={<FundOutlined />}
                styles={{ content: { fontSize: isMobile ? 20 : 24 } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={
                  <Space>
                    预期投入
                    <Tooltip title="您为该投资方向设定的目标投入金额，用于跟踪投资进度">
                      <QuestionCircleOutlined
                        style={{
                          color: "#1890ff",
                          cursor: "help",
                          fontSize: 12,
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
                value={direction?.expectedAmount || 0}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{
                  content: { color: "#1890ff", fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={
                  <Space>
                    实际投入
                    <Tooltip title="当前持仓的成本总和（买入金额 - 卖出金额 + 分红再投资）。反映当前实际还留在投资中的资金，不包括已清仓的基金。用于计算投入进度（实际投入 ÷ 预期投入）。">
                      <QuestionCircleOutlined
                        style={{
                          color: "#1890ff",
                          cursor: "help",
                          fontSize: 12,
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
                value={totalHoldingCost}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{
                  content: { color: "#52c41a", fontSize: isMobile ? 18 : 24 },
                }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={12} md={6}>
            <Card>
              <Statistic
                title={
                  <Space>
                    投入进度
                    <Tooltip title="实际投入 ÷ 预期投入 × 100%，反映投资计划的完成度">
                      <QuestionCircleOutlined
                        style={{
                          color: "#1890ff",
                          cursor: "help",
                          fontSize: 12,
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
                value={
                  direction?.expectedAmount
                    ? (totalHoldingCost / Number(direction.expectedAmount)) *
                      100
                    : 0
                }
                precision={1}
                suffix="%"
                styles={{
                  content: {
                    color:
                      totalHoldingCost >= Number(direction?.expectedAmount || 0)
                        ? "#52c41a"
                        : "#faad14",
                    fontSize: isMobile ? 18 : 24,
                  },
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* 盈亏折线图 */}
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
              onChange={(e) => setChartDays(e.target.value)}
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
                      // name参数是dataKey的值
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

        {/* 最近5笔投资记录 */}
        <Card
          title={
            <Space>
              <DollarOutlined />
              <span>最近5笔投资记录</span>
            </Space>
          }
          style={{ marginBottom: isMobile ? 12 : 24 }}
        >
          {(() => {
            // 从所有基金中提取所有交易记录
            const allTransactions: ExtendedTransaction[] = [];

            funds.forEach((fund) => {
              if (fund.transactions && fund.transactions.length > 0) {
                fund.transactions.forEach((tx) => {
                  allTransactions.push({
                    ...tx,
                    fundId: fund.id,
                    fundName: fund.name,
                    fundCode: fund.code,
                  });
                });
              }
            });

            // 按日期倒序排序，取最新的5笔
            const recentTransactions = allTransactions
              .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA; // 最新的在前
              })
              .slice(0, 5);

            if (recentTransactions.length === 0) {
              return (
                <div
                  style={{ textAlign: "center", padding: 40, color: "#999" }}
                >
                  暂无交易记录
                </div>
              );
            }

            const typeMap: Record<string, { label: string; color: string }> = {
              BUY: { label: "买入", color: "#52c41a" },
              SELL: { label: "卖出", color: "#ff4d4f" },
              DIVIDEND: { label: "分红", color: "#1890ff" },
            };

            return (
              <div>
                {isMobile ? (
                  // 移动端：卡片列表
                  <div>
                    {recentTransactions.map((tx) => {
                      const typeInfo = typeMap[tx.type] || {
                        label: tx.type,
                        color: "#999",
                      };
                      return (
                        <Card
                          key={tx.id}
                          size="small"
                          style={{ marginBottom: 12 }}
                        >
                          <Flex
                            justify="space-between"
                            align="flex-start"
                            vertical
                            gap={8}
                          >
                            <Flex
                              justify="space-between"
                              align="center"
                              style={{ width: "100%" }}
                            >
                              <Text strong style={{ fontSize: 14 }}>
                                {tx.fundName}
                              </Text>
                              <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                            </Flex>
                            <Row gutter={[8, 8]} style={{ width: "100%" }}>
                              <Col span={12}>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  日期
                                </Text>
                                <div style={{ fontSize: 13 }}>
                                  {dayjs(tx.date).format("YYYY-MM-DD")}
                                </div>
                              </Col>
                              {tx.amount !== undefined && (
                                <Col span={12}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    金额
                                  </Text>
                                  <div style={{ fontSize: 13 }}>
                                    ¥{Number(tx.amount).toLocaleString()}
                                  </div>
                                </Col>
                              )}
                              {tx.shares !== undefined && (
                                <Col span={12}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    份额
                                  </Text>
                                  <div style={{ fontSize: 13 }}>
                                    {Number(tx.shares).toFixed(2)}
                                  </div>
                                </Col>
                              )}
                              {tx.price !== undefined && tx.price !== null && (
                                <Col span={12}>
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 11 }}
                                  >
                                    净值
                                  </Text>
                                  <div style={{ fontSize: 13 }}>
                                    ¥{Number(tx.price).toFixed(4)}
                                  </div>
                                </Col>
                              )}
                            </Row>
                          </Flex>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  // 桌面端：表格
                  <Table
                    dataSource={recentTransactions}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: "日期",
                        dataIndex: "date",
                        key: "date",
                        width: 110,
                        render: (date: string) =>
                          dayjs(date).format("YYYY-MM-DD"),
                      },
                      {
                        title: "基金名称",
                        dataIndex: "fundName",
                        key: "fundName",
                        width: 180,
                        ellipsis: true,
                        render: (name: string, record: ExtendedTransaction) => (
                          <Tooltip title={`${record.fundCode} - ${name}`}>
                            <Text strong>{name}</Text>
                          </Tooltip>
                        ),
                      },
                      {
                        title: "操作类型",
                        dataIndex: "type",
                        key: "type",
                        width: 100,
                        align: "center" as const,
                        render: (type: string) => {
                          const typeInfo = typeMap[type] || {
                            label: type,
                            color: "#999",
                          };
                          return (
                            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                          );
                        },
                      },
                      {
                        title: "金额",
                        dataIndex: "amount",
                        key: "amount",
                        width: 120,
                        align: "right" as const,
                        render: (amount: number | undefined) =>
                          amount !== undefined
                            ? `¥${Number(amount).toLocaleString()}`
                            : "-",
                      },
                      {
                        title: "份额",
                        dataIndex: "shares",
                        key: "shares",
                        width: 110,
                        align: "right" as const,
                        render: (shares: number | undefined) =>
                          shares !== undefined
                            ? Number(shares).toFixed(2)
                            : "-",
                      },
                      {
                        title: "净值",
                        dataIndex: "price",
                        key: "price",
                        width: 100,
                        align: "right" as const,
                        render: (price: number | undefined) =>
                          price !== undefined && price !== null
                            ? `¥${Number(price).toFixed(4)}`
                            : "-",
                      },
                      {
                        title: "备注",
                        dataIndex: "remark",
                        key: "remark",
                        ellipsis: true,
                        render: (remark: string | null) => remark || "-",
                      },
                    ]}
                  />
                )}
              </div>
            );
          })()}
        </Card>

        {/* 汇总收益统计卡片 */}
        {summary && (
          <Card
            title={
              <Space>
                <DollarOutlined />
                <span>收益汇总</span>
              </Space>
            }
            className="mb-6"
            extra={
              <Button
                size="small"
                onClick={() => {
                  loadSummary();
                  message.success("已刷新汇总数据");
                }}
              >
                刷新
              </Button>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      历史总投入
                      <Tooltip title="历史上所有买入交易的金额总和，包括已清仓的基金。用于计算累计收益率（累计总收益 ÷ 历史总投入）。即使基金已全部卖出，其买入金额仍会计入历史总投入。">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalInvested)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      当前市值
                      <Tooltip title="当前持仓份额 × 最新净值，反映持仓的当前价值">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalCurrentValue)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      持仓成本
                      <Tooltip title="当前持仓份额的成本价总和，不包括已清仓的基金。如果基金已全部卖出，其成本不会计入持仓成本。">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalCost)}
                  precision={2}
                  prefix="¥"
                  styles={{ content: { fontSize: 18 } }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      持仓收益
                      <Tooltip title="当前市值 - 持仓成本，反映当前持仓的盈亏情况">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.holdingProfit)}
                  precision={2}
                  prefix="¥"
                  styles={{
                    content: {
                      fontSize: 18,
                      color:
                        parseFloat(summary.holdingProfit) >= 0
                          ? "#cf1322"
                          : "#3f8600",
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      累计总收益
                      <Tooltip title="持仓收益 + 卖出收益 + 现金分红 + 分红再投资，反映整体投资盈亏">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalProfit)}
                  precision={2}
                  prefix="¥"
                  styles={{
                    content: {
                      fontSize: 20,
                      fontWeight: "bold",
                      color:
                        parseFloat(summary.totalProfit) >= 0
                          ? "#cf1322"
                          : "#3f8600",
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      累计收益率
                      <Tooltip title="累计总收益 ÷ 历史总投入 × 100%，反映投资回报率。历史总投入包括已清仓的基金，用于衡量整体投资表现。">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalProfitRate)}
                  precision={2}
                  suffix="%"
                  styles={{
                    content: {
                      fontSize: 20,
                      fontWeight: "bold",
                      color:
                        parseFloat(summary.totalProfitRate) >= 0
                          ? "#cf1322"
                          : "#3f8600",
                    },
                  }}
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      卖出收益
                      <Tooltip title="已卖出基金的收益总和，卖出收益 = 卖出金额 - 成本 - 手续费">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalSellProfit)}
                  precision={2}
                  prefix="¥"
                />
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Statistic
                  title={
                    <Space>
                      现金分红
                      <Tooltip title="基金派发的现金分红总额，已到账的现金收益">
                        <QuestionCircleOutlined
                          style={{
                            color: "#1890ff",
                            cursor: "help",
                            fontSize: 12,
                          }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  value={parseFloat(summary.totalDividendCash)}
                  precision={2}
                  prefix="¥"
                />
              </Col>
            </Row>
            <Divider style={{ margin: "16px 0" }} />
            <Text type="secondary">
              包含{summary.fundCount}只基金的完整收益统计，累计收益 = 持仓收益 +
              卖出收益 + 现金分红 + 分红再投资
            </Text>
          </Card>
        )}

        {/* 基金列表 - 按分类分组 */}
        {(() => {
          // 先计算整个投资方向的总市值（所有基金的当前市值之和）
          const totalDirectionValue = funds.reduce((sum, fund) => {
            const stats = fundsStats.get(fund.id);
            if (stats) {
              // 当前市值 = 持仓成本 + 持仓收益
              // 持仓收益 = 持仓成本 * 持仓收益率 / 100
              const holdingProfit =
                (stats.holdingCost * stats.holdingProfitRate) / 100;
              return sum + stats.holdingCost + holdingProfit;
            }
            return sum;
          }, 0);

          return Object.entries(groupedFunds).map(
            ([category, categoryFunds]) => {
              // 计算该分类下所有基金的持仓成本总和（已投入）
              const categoryHoldingCost = categoryFunds.reduce((sum, fund) => {
                const stats = fundsStats.get(fund.id);
                return sum + (stats?.holdingCost || 0);
              }, 0);

              // 计算该分类下所有基金的当前市值总和（持仓成本 + 持仓收益）
              const categoryCurrentValue = categoryFunds.reduce((sum, fund) => {
                const stats = fundsStats.get(fund.id);
                if (stats) {
                  // 当前市值 = 持仓成本 + 持仓收益
                  // 持仓收益 = 持仓成本 * 持仓收益率 / 100
                  const holdingProfit =
                    (stats.holdingCost * stats.holdingProfitRate) / 100;
                  return sum + stats.holdingCost + holdingProfit;
                }
                return sum;
              }, 0);

              // 获取该分类的目标百分比
              const categoryTarget = categoryTargets.find(
                (t) => t.categoryName === category
              );
              const targetPercent = categoryTarget?.targetPercent || 0;
              // 根据投资方向的预期投入金额和目标百分比计算目标金额
              const targetAmount =
                targetPercent > 0 && direction?.expectedAmount
                  ? (Number(direction.expectedAmount) * targetPercent) / 100
                  : 0;
              // 进度 = 已投入（持仓成本）/ 目标金额 * 100%
              // 目标金额是基于预期投入金额的，所以用已投入来计算进度更合理
              const progress =
                targetAmount > 0
                  ? (categoryHoldingCost / Number(targetAmount)) * 100
                  : 0;

              // 计算实际仓位占比（该分类的当前市值 / 整个投资方向的总市值）
              const actualPositionPercent =
                totalDirectionValue > 0
                  ? (categoryCurrentValue / totalDirectionValue) * 100
                  : 0;

              return (
                <Card
                  key={category}
                  title={
                    <Flex
                      justify="space-between"
                      align={isMobile ? "flex-start" : "center"}
                      vertical={isMobile}
                      gap={isMobile ? 8 : 0}
                    >
                      <Space wrap>
                        <Tag color="blue">{category}</Tag>
                        <Text type="secondary">
                          {categoryFunds.length} 只基金
                        </Text>
                        {categoryAlerts.has(category) && (
                          <Tooltip
                            title={
                              <div>
                                {Array.from(
                                  new Map(
                                    categoryAlerts
                                      .get(category)!
                                      .map((alert) => [alert.fundId, alert])
                                  ).values()
                                ).map((alert) => (
                                  <div
                                    key={`${alert.fundId}-${alert.reason}`}
                                    style={{ marginBottom: 4 }}
                                  >
                                    {alert.reason === "days" &&
                                    alert.fundId === 0 ? (
                                      <div>
                                        <strong>{alert.fundName}</strong>{" "}
                                        分类距离上次买入已超过
                                        {alert.daysSinceLastBuy}天
                                      </div>
                                    ) : (
                                      <>
                                        <strong>{alert.fundName}</strong>:
                                        {alert.reason === "days" && (
                                          <span>
                                            {" "}
                                            距离上次买入已超过
                                            {alert.daysSinceLastBuy}天
                                          </span>
                                        )}
                                        {alert.reason === "price" && (
                                          <span>
                                            {" "}
                                            净值相比上次买入下跌
                                            {alert.priceDropPercent?.toFixed(2)}
                                            %
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            }
                          >
                            <Tag
                              color="orange"
                              icon={<ExclamationCircleOutlined />}
                              style={{ cursor: "help" }}
                            >
                              {(() => {
                                const fundAlerts = categoryAlerts
                                  .get(category)!
                                  .filter((a) => a.fundId !== 0);
                                const categoryAlert = categoryAlerts
                                  .get(category)!
                                  .find(
                                    (a) => a.fundId === 0 && a.reason === "days"
                                  );

                                if (fundAlerts.length > 0 && categoryAlert) {
                                  return `有${fundAlerts.length}只基金需要关注，分类超过30天未买入`;
                                } else if (fundAlerts.length > 0) {
                                  return `有${fundAlerts.length}只基金需要关注`;
                                } else if (categoryAlert) {
                                  return "分类超过30天未买入";
                                }
                                return "需要关注";
                              })()}
                            </Tag>
                          </Tooltip>
                        )}
                        {categoryPositionAlerts.has(category) && (
                          <Tooltip
                            title={
                              <div>
                                <div style={{ marginBottom: 4 }}>
                                  <strong>仓位超标提醒</strong>
                                </div>
                                <div>
                                  当前市值: ¥
                                  {categoryPositionAlerts
                                    .get(category)!
                                    .currentValue.toLocaleString()}
                                </div>
                                <div>
                                  目标仓位: ¥
                                  {categoryPositionAlerts
                                    .get(category)!
                                    .targetAmount.toLocaleString()}
                                </div>
                                <div>
                                  超标:{" "}
                                  {categoryPositionAlerts
                                    .get(category)!
                                    .excessPercent.toFixed(2)}
                                  %
                                </div>
                                <div
                                  style={{
                                    marginTop: 8,
                                    fontSize: 12,
                                    color: "#999",
                                  }}
                                >
                                  建议进行仓位平衡，避免仓位过大
                                </div>
                              </div>
                            }
                          >
                            <Tag
                              color="red"
                              icon={<ExclamationCircleOutlined />}
                              style={{ cursor: "help" }}
                            >
                              仓位超标
                            </Tag>
                          </Tooltip>
                        )}
                      </Space>
                      <Space wrap>
                        {targetAmount > 0 ? (
                          <>
                            <Text
                              type="secondary"
                              style={{ fontSize: isMobile ? 12 : 14 }}
                            >
                              {isMobile ? "已投入" : "已投入"}: ¥
                              {categoryHoldingCost.toLocaleString()}
                              {!isMobile &&
                                ` / 目标: ¥${Number(
                                  targetAmount
                                ).toLocaleString()}${
                                  targetPercent > 0
                                    ? ` (${Number(targetPercent).toFixed(1)}%)`
                                    : ""
                                }`}
                            </Text>
                            <Tag
                              color={progress >= 100 ? "success" : "processing"}
                            >
                              {progress.toFixed(1)}%
                            </Tag>
                            <Text
                              type="secondary"
                              style={{ fontSize: isMobile ? 12 : 14 }}
                            >
                              {isMobile ? "当前市值" : "当前市值"}: ¥
                              {categoryCurrentValue.toLocaleString()}
                              {!isMobile &&
                                ` (${actualPositionPercent.toFixed(1)}%)`}
                            </Text>
                            {isMobile && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                占比: {actualPositionPercent.toFixed(1)}%
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            <Text type="secondary">
                              已投入: ¥{categoryHoldingCost.toLocaleString()}
                            </Text>
                            <Text type="secondary">
                              当前市值: ¥{categoryCurrentValue.toLocaleString()}
                            </Text>
                            <Text type="secondary">
                              占比: {actualPositionPercent.toFixed(1)}%
                            </Text>
                          </>
                        )}
                        <Button
                          size="small"
                          type="link"
                          onClick={() =>
                            handleOpenTargetModal(category, targetPercent)
                          }
                        >
                          设置目标
                        </Button>
                      </Space>
                    </Flex>
                  }
                  style={{ marginBottom: isMobile ? 12 : 16 }}
                >
                  {isMobile ? (
                    // 移动端：卡片列表
                    <div>
                      {categoryFunds.map((fund) => renderMobileFundCard(fund))}
                    </div>
                  ) : (
                    // 桌面端：表格
                    <Table
                      columns={columns}
                      dataSource={categoryFunds}
                      loading={loading}
                      rowKey="id"
                      pagination={false}
                      scroll={{ x: 886 }}
                      size="small"
                    />
                  )}
                </Card>
              );
            }
          );
        })()}

        {funds.length === 0 && !loading && (
          <Card>
            <Flex
              vertical
              align="center"
              justify="center"
              style={{ padding: "40px 0" }}
            >
              <FundOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />
              <Text type="secondary" style={{ marginTop: 16 }}>
                还没有添加基金，点击&ldquo;新建基金&rdquo;开始
              </Text>
            </Flex>
          </Card>
        )}

        {/* 新建/编辑弹窗 */}
        <Modal
          title={editingFund ? "编辑基金" : "新建基金"}
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 24 }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="基金代码"
                  name="code"
                  rules={[{ required: true, message: "请输入基金代码" }]}
                >
                  <Input placeholder="如：000001" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="分类标识"
                  name="category"
                  tooltip="用于分组展示，如：标普、纳指、沪深300等"
                >
                  <Select
                    placeholder="选择或输入分类"
                    size="large"
                    showSearch
                    allowClear
                    options={categoryOptions}
                    onSearch={(value) => {
                      setCategorySearchValue(value);
                    }}
                    onBlur={() => {
                      // 当失去焦点时，如果输入的值不在选项中，自动添加
                      if (
                        categorySearchValue &&
                        categorySearchValue.trim() !== ""
                      ) {
                        const trimmedValue = categorySearchValue.trim();
                        const exists = categoryOptions.some(
                          (opt) => opt.value === trimmedValue
                        );
                        if (!exists) {
                          const newOption = {
                            label: trimmedValue,
                            value: trimmedValue,
                          };
                          setCategoryOptions((prev) => {
                            const newOptions = [...prev, newOption];
                            // 按字母顺序排序
                            return newOptions.sort((a, b) =>
                              a.value.localeCompare(b.value)
                            );
                          });
                          // 自动选中新创建的分类
                          form.setFieldValue("category", trimmedValue);
                        }
                        setCategorySearchValue("");
                      }
                    }}
                    onKeyDown={(e) => {
                      // 当用户按回车时，如果输入的值不在选项中，自动添加并选中
                      if (e.key === "Enter" && categorySearchValue) {
                        const trimmedValue = categorySearchValue.trim();
                        if (trimmedValue !== "") {
                          const exists = categoryOptions.some(
                            (opt) => opt.value === trimmedValue
                          );
                          if (!exists) {
                            const newOption = {
                              label: trimmedValue,
                              value: trimmedValue,
                            };
                            setCategoryOptions((prev) => {
                              const newOptions = [...prev, newOption];
                              return newOptions.sort((a, b) =>
                                a.value.localeCompare(b.value)
                              );
                            });
                            form.setFieldValue("category", trimmedValue);
                          }
                          setCategorySearchValue("");
                          e.preventDefault();
                        }
                      }
                    }}
                    filterOption={(input, option) => {
                      if (!option?.value) return false;
                      return (option.value as string)
                        .toLowerCase()
                        .includes(input.toLowerCase());
                    }}
                    notFoundContent={
                      categorySearchValue ? (
                        <div style={{ padding: "8px 0", textAlign: "center" }}>
                          <span style={{ color: "#999", fontSize: 12 }}>
                            按回车创建新分类 &quot;{categorySearchValue}&quot;
                          </span>
                        </div>
                      ) : null
                    }
                    onSelect={() => {
                      setCategorySearchValue("");
                    }}
                    onClear={() => {
                      setCategorySearchValue("");
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="基金名称"
              name="name"
              rules={[{ required: true, message: "请输入基金名称" }]}
            >
              <Input placeholder="如：华夏上证50ETF" size="large" />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remark"
              tooltip="记录限购、换购等特殊情况"
            >
              <TextArea
                placeholder="如：该基金QDII限购，改买XXX基金"
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  {editingFund ? "更新" : "创建"}
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>

        {/* 设置分类目标弹窗 */}
        <Modal
          title={`设置"${editingCategory}"分类目标仓位`}
          open={targetModalOpen}
          onCancel={() => {
            setTargetModalOpen(false);
            targetForm.resetFields();
          }}
          footer={null}
          width={500}
        >
          <Form
            form={targetForm}
            layout="vertical"
            onFinish={handleSaveTarget}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="目标仓位百分比 (%)"
              name="targetPercent"
              rules={[
                { required: true, message: "请输入目标仓位百分比" },
                {
                  type: "number",
                  min: 0,
                  max: 100,
                  message: "百分比必须在 0-100 之间",
                },
              ]}
              tooltip={`该分类的目标仓位百分比。当前投资方向的预期投入为 ¥${
                direction?.expectedAmount?.toLocaleString() || 0
              }，设置后将自动计算目标金额。`}
            >
              <InputNumber<number>
                placeholder="请输入百分比（0-100）"
                size="large"
                style={{ width: "100%" }}
                min={0}
                max={100}
                precision={2}
                formatter={(value) => (value ? `${value}%` : "")}
                parser={(value) => {
                  const num = parseFloat(value!.replace("%", ""));
                  if (isNaN(num)) return 0;
                  return Math.max(0, Math.min(100, num));
                }}
                addonAfter="%"
              />
            </Form.Item>
            {direction?.expectedAmount &&
              targetForm.getFieldValue("targetPercent") > 0 && (
                <Form.Item label="计算后的目标金额">
                  <Text type="secondary">
                    ¥
                    {(
                      (Number(direction.expectedAmount) *
                        targetForm.getFieldValue("targetPercent")) /
                      100
                    ).toLocaleString()}
                  </Text>
                </Form.Item>
              )}

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setTargetModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
