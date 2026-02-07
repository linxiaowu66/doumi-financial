"use client";

import { useState, useEffect, use, useCallback } from "react";
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  InputNumber,
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
  Radio,
  DatePicker,
  Checkbox,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface PendingTransaction {
  id: number;
  fundId: number;
  type: string;
  applyDate: string;
  applyAmount?: number;
  applyShares?: number;
  status: string;
  createdAt: string;
}

interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
  latestNetWorth?: number | null;
  netWorthDate?: string | null;
  netWorthUpdateAt?: string | null;
  confirmDays?: number;
  defaultBuyFee?: number;
  defaultSellFee?: number;
  direction: {
    id: number;
    name: string;
  };
  pendingTransactions?: PendingTransaction[];
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  shares: number;
  price: number;
  fee: number;
  date: string;
  dividendReinvest: boolean;
  remark: string | null;
}

interface FundStats {
  holdingShares: number;
  holdingCost: number;
  avgCostPrice: number;
  holdingValue: number;
  holdingProfit: number;
  holdingProfitRate: number;
  totalDividendCash: number;
  totalDividendReinvest: number;
  totalSellProfit: number;
  totalProfit: number;
  totalProfitRate: number;
  transactionCount: number;
}

interface PlannedPurchase {
  id: number;
  fundId: number;
  plannedAmount: number;
  status: string;
  createdAt: string;
  purchasedAt: string | null;
}

export default function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const fundId = parseInt(resolvedParams.id);
  const router = useRouter();

  const [fund, setFund] = useState<Fund | null>(null);
  const [stats, setStats] = useState<FundStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [executePlanModalOpen, setExecutePlanModalOpen] = useState(false);
  const [executingPlan, setExecutingPlan] = useState<PlannedPurchase | null>(
    null
  );
  const [transactionType, setTransactionType] = useState<string>("BUY");
  const [isPendingMode, setIsPendingMode] = useState(false); // 是否为待确认模式
  const [currentPrice, setCurrentPrice] = useState<number>(0); // 当前净值
  const [fetchingPrice, setFetchingPrice] = useState(false); // 正在获取净值
  const [fetchingHistoryPrice, setFetchingHistoryPrice] = useState(false); // 正在获取历史净值
  const [isMobile, setIsMobile] = useState(false); // 移动端检测
  const [form] = Form.useForm();
  const [planForm] = Form.useForm();
  const [executeForm] = Form.useForm();

  // 处理负数零的工具函数
  const normalizeZero = (value: number | undefined | null): number => {
    if (value === undefined || value === null) return 0;
    return Math.abs(value) < 1e-10 ? 0 : value;
  };

  // 监听分红类型，用于动态显示/隐藏净值字段
  const dividendReinvest = Form.useWatch("dividendReinvest", form);
  const dividendShares = Form.useWatch("dividendShares", form); // 监听再投资份数
  const dividendDate = Form.useWatch("date", form); // 监听交易日期
  const isPending = Form.useWatch("isPending", form); // 监听是否为待确认模式
  const afterThreePM = Form.useWatch("afterThreePM", form); // 监听是否为15:00后

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // 判断是否需要更新净值（今天未更新过则需要更新）
  const shouldUpdateNetWorth = (
    lastUpdateTime: string | null | undefined
  ): boolean => {
    if (!lastUpdateTime) {
      return true; // 从未更新过，需要获取
    }

    const lastUpdate = dayjs(lastUpdateTime);
    const now = dayjs();

    // 如果上次更新不是今天，需要重新获取
    return !lastUpdate.isSame(now, "day");
  };

  // 获取基金最新净值
  const fetchCurrentPrice = useCallback(
    async (code: string) => {
      setFetchingPrice(true);
      try {
        const response = await fetch(`/api/fund-price?code=${code}`);
        const data = await response.json();

        if (response.ok && data.netWorth) {
          const price = parseFloat(data.netWorth);
          setCurrentPrice(price);

          // 保存净值到数据库
          await fetch(`/api/funds/${fundId}/net-worth`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              netWorth: data.netWorth,
              netWorthDate: data.netWorthDate,
            }),
          });

          // 更新fund对象
          setFund((prev) =>
            prev
              ? {
                  ...prev,
                  latestNetWorth: price,
                  netWorthDate: data.netWorthDate,
                  netWorthUpdateAt: new Date().toISOString(),
                }
              : null
          );

          message.success(
            `已获取最新净值：¥${price}（${data.netWorthDate || ""}）`
          );
        } else {
          message.warning("无法获取最新净值，请手动输入");
        }
      } catch (error) {
        console.error("获取净值失败:", error);
        message.warning("获取净值失败，请手动输入");
      } finally {
        setFetchingPrice(false);
      }
    },
    [fundId]
  );

  // 获取指定日期的历史净值
  const fetchHistoricalPrice = useCallback(
    async (code: string, date: string) => {
      setFetchingHistoryPrice(true);
      try {
        const response = await fetch(
          `/api/fund-price-history?code=${code}&date=${date}`
        );
        const data = await response.json();

        if (response.ok && data.netWorth) {
          // 如果使用的是最近交易日的净值，显示提示信息
          if (data.matchType === "nearest" && data.message) {
            message.info(data.message);
          }
          return {
            netWorth: parseFloat(data.netWorth),
            date: data.date,
            matchType: data.matchType,
          };
        } else {
          const errorMsg = data.error || "无法获取该日期的净值数据";
          if (data.availableDates && data.availableDates.length > 0) {
            message.warning(
              `${errorMsg}。最近的可用日期：${data.availableDates
                .slice(0, 3)
                .join(", ")}`
            );
          } else {
            message.warning(errorMsg);
          }
          return null;
        }
      } catch (error) {
        console.error("获取历史净值失败:", error);
        message.warning("获取历史净值失败");
        return null;
      } finally {
        setFetchingHistoryPrice(false);
      }
    },
    []
  );

  // 加载基金详情
  const loadFund = useCallback(async () => {
    try {
      const response = await fetch(`/api/funds/${fundId}`);
      const data = await response.json();
      setFund(data);
      if (data.pendingTransactions) {
        setPendingTransactions(data.pendingTransactions);
      } else {
        setPendingTransactions([]);
      }

      // 如果有缓存的净值，使用缓存值
      if (data.latestNetWorth) {
        setCurrentPrice(parseFloat(data.latestNetWorth));
      }

      // 检查是否需要自动获取最新净值
      if (data.code) {
        const needUpdate = shouldUpdateNetWorth(data.netWorthUpdateAt);
        if (needUpdate) {
          fetchCurrentPrice(data.code);
        } else {
          console.log("净值已是最新，无需重复获取");
        }
      }
    } catch {
      message.error("加载基金详情失败");
    }
  }, [fundId, fetchCurrentPrice]);

  // 加载交易记录
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/transactions?fundId=${fundId}`);
      const data = await response.json();
      setTransactions(data);

      // 加载统计信息（传入当前净值）
      const priceParam =
        currentPrice > 0 ? `?currentPrice=${currentPrice}` : "";
      const statsRes = await fetch(`/api/funds/${fundId}/stats${priceParam}`);
      const statsData = await statsRes.json();
      setStats(statsData);
    } catch {
      message.error("加载交易记录失败");
    } finally {
      setLoading(false);
    }
  }, [fundId, currentPrice]);

  // 加载计划买入列表
  const loadPlannedPurchases = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/planned-purchases?fundId=${fundId}&status=PENDING`
      );
      const data = await response.json();
      setPlannedPurchases(data);
    } catch {
      message.error("加载计划买入失败");
    }
  }, [fundId]);

  useEffect(() => {
    loadFund();
    loadPlannedPurchases();
  }, [fundId, loadFund, loadPlannedPurchases]);

  useEffect(() => {
    if (currentPrice > 0) {
      loadTransactions();
    }
  }, [currentPrice, loadTransactions]);

  // 当分红再投资时，监听日期和份数变化，自动获取净值并计算分红金额
  useEffect(() => {
    const autoCalculateDividendAmount = async () => {
      // 只在分红再投资模式下触发
      if (
        transactionType === "DIVIDEND" &&
        dividendReinvest &&
        dividendDate &&
        dividendShares &&
        dividendShares > 0 &&
        fund?.code
      ) {
        const dateStr = dayjs(dividendDate).format("YYYY-MM-DD");
        const result = await fetchHistoricalPrice(fund.code, dateStr);

        if (result) {
          // 计算分红金额 = 份数 × 净值
          const amount = dividendShares * result.netWorth;
          form.setFieldsValue({
            price: result.netWorth,
            amount: amount,
          });

          // 只在精确匹配时显示成功消息（最近日期的消息已在fetchHistoricalPrice中显示）
          if (result.matchType === "exact") {
            message.success(
              `已获取 ${dateStr} 净值：¥${result.netWorth.toFixed(
                4
              )}，计算分红金额：¥${amount.toFixed(2)}`
            );
          } else {
            message.success(`计算分红金额：¥${amount.toFixed(2)}`);
          }
        }
      }
    };

    autoCalculateDividendAmount();
  }, [
    transactionType,
    dividendReinvest,
    dividendDate,
    dividendShares,
    fund?.code,
    fetchHistoricalPrice,
    form,
  ]);

  // 打开交易弹窗
  const handleOpenModal = (type: string) => {
    setTransactionType(type);
    form.resetFields();
    form.setFieldsValue({
      type,
      date: dayjs(),
    });
    setModalOpen(true);
  };

  // 一键清仓：自动填充卖出所有份额
  const handleLiquidateAll = () => {
    if (!stats || !stats.holdingShares || stats.holdingShares <= 0) {
      message.warning("当前没有持仓份额，无法清仓");
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      message.warning("请先获取或输入当前净值");
      return;
    }

    setTransactionType("SELL");
    form.resetFields();
    form.setFieldsValue({
      type: "SELL",
      date: dayjs(),
      shares: Number(stats.holdingShares.toFixed(2)), // 保留2位小数
      price: currentPrice,
      fee: 0,
      remark: "清仓",
    });
    setModalOpen(true);
    message.info("已自动填充清仓信息，请确认后提交");
  };

  // 提交交易
  const handleSubmit = async (values: {
    type: string;
    amount: number;
    fee: number;
    price: number;
    shares: number;
    date: Dayjs;
    dividendReinvest: boolean;
    dividendShares?: number; // 分红再投资的份数
    remark: string;
    isPending?: boolean; // 新增：是否待确认
    afterThreePM?: boolean; // 新增：是否为15:00后
  }) => {
    try {
      if (values.isPending) {
        // 待确认交易逻辑
        // 根据是否勾选"15:00后"，设置时间
        // 如果勾选，设为 16:00 (CN)，即 local time 16:00
        // 如果未勾选，设为 09:00 (CN)，即 local time 09:00
        const submitDate = dayjs(values.date)
          .hour(values.afterThreePM ? 16 : 9)
          .minute(0)
          .second(0);

        const response = await fetch("/api/pending-transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fundId,
            type: values.type,
            applyDate: submitDate.toISOString(),
            applyAmount: values.type === 'BUY' ? values.amount : undefined,
            applyShares: values.type === 'SELL' ? values.shares : undefined,
          }),
        });

        if (response.ok) {
          message.success("待确认交易添加成功");
          setModalOpen(false);
          form.resetFields();
          loadFund(); // 刷新待确认列表
        } else {
          message.error("添加待确认交易失败");
        }
        return;
      }

      let calculatedShares = 0;
      let calculatedAmount = 0;

      // 根据不同类型计算份额和金额
      if (values.type === "BUY") {
        // 买入：金额 / 净值 = 份额（扣除手续费后）
        const netAmount = values.amount - (values.fee || 0);
        calculatedShares = netAmount / values.price;
        calculatedAmount = values.amount;
      } else if (values.type === "SELL") {
        // 卖出：份额 * 净值 = 金额（扣除手续费后）
        calculatedAmount = values.shares * values.price - (values.fee || 0);
        calculatedShares = -Math.abs(values.shares); // 负数表示减少
      } else if (values.type === "DIVIDEND") {
        // 分红
        calculatedAmount = values.amount;
        if (values.dividendReinvest) {
          // 分红再投资：使用用户输入的份数（已经自动计算好的金额）
          calculatedShares = values.dividendShares || 0;
          // 如果amount没有值（可能自动计算失败），手动计算
          if (!calculatedAmount && values.price) {
            calculatedAmount = calculatedShares * values.price;
          }
        } else {
          // 现金分红：份额为0
          calculatedShares = 0;
        }
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId,
          type: values.type,
          amount: calculatedAmount,
          shares: calculatedShares,
          // 现金分红时，price设为0（数据库要求必填，但现金分红不需要净值）
          price:
            values.type === "DIVIDEND" && !values.dividendReinvest
              ? 0
              : values.price,
          fee: values.fee || 0,
          date: values.date.toISOString(),
          dividendReinvest: values.dividendReinvest || false,
          remark: values.remark,
        }),
      });

      if (response.ok) {
        message.success("交易记录添加成功");
        setModalOpen(false);
        form.resetFields();
        loadTransactions();
      } else {
        message.error("添加失败");
      }
    } catch {
      message.error("添加失败");
    }
  };

  // 删除交易
  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("删除成功");
        loadTransactions();
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("删除失败");
    }
  };

  // 删除待确认交易
  const handleDeletePending = async (id: number) => {
    try {
      const response = await fetch(`/api/pending-transactions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("删除成功");
        loadFund(); // 重新加载以刷新待确认列表
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("删除失败");
    }
  };

  // 批量确认待处理交易
  const handleBatchConfirm = async () => {
    setConfirmLoading(true);
    try {
      const response = await fetch("/api/pending-transactions/batch-confirm", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok) {
        const confirmedCount =
          data.logs?.filter((l: string) => l.includes("成功转正") || l.includes("Confirmed")).length || 0;

        if (confirmedCount > 0) {
          message.success(`成功确认 ${confirmedCount} 笔交易`);
          loadFund(); // 刷新待确认列表
          loadTransactions(); // 刷新正式交易列表
        } else {
          message.info("暂无符合确认条件的交易（可能未到确认日或无净值）");
        }
      } else {
        message.error("批量确认失败");
      }
    } catch {
      message.error("批量确认失败");
    } finally {
      setConfirmLoading(false);
    }
  };

  // 新建计划买入
  const handleCreatePlan = async (values: { plannedAmount: number }) => {
    try {
      const response = await fetch("/api/planned-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundId,
          plannedAmount: values.plannedAmount,
        }),
      });

      if (response.ok) {
        message.success("计划买入创建成功");
        setPlanModalOpen(false);
        planForm.resetFields();
        loadPlannedPurchases();
      } else {
        message.error("创建失败");
      }
    } catch {
      message.error("创建失败");
    }
  };

  // 删除计划买入
  const handleDeletePlan = async (id: number) => {
    try {
      const response = await fetch(`/api/planned-purchases/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        message.success("删除成功");
        loadPlannedPurchases();
      } else {
        message.error("删除失败");
      }
    } catch {
      message.error("删除失败");
    }
  };

  // 打开执行买入弹窗
  const handleOpenExecuteModal = (plan: PlannedPurchase) => {
    setExecutingPlan(plan);
    executeForm.setFieldsValue({
      plannedAmount: plan.plannedAmount,
      date: dayjs(),
    });
    setExecutePlanModalOpen(true);
  };

  // 执行计划买入
  const handleExecutePlan = async (values: {
    price: number;
    fee: number;
    date: Dayjs;
  }) => {
    if (!executingPlan) return;

    try {
      const response = await fetch(
        `/api/planned-purchases/${executingPlan.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            price: values.price,
            fee: values.fee || 0,
            date: values.date.toISOString(),
          }),
        }
      );

      if (response.ok) {
        message.success("执行成功，已创建买入交易记录");
        setExecutePlanModalOpen(false);
        executeForm.resetFields();
        loadTransactions();
        loadPlannedPurchases();
      } else {
        message.error("执行失败");
      }
    } catch {
      message.error("执行失败");
    }
  };

  // 移动端交易记录卡片渲染
  const renderMobileTransactionCard = (transaction: Transaction) => {
    const typeMap: Record<string, { text: string; color: string }> = {
      BUY: { text: "买入", color: "green" },
      SELL: { text: "卖出", color: "red" },
      DIVIDEND: {
        text: transaction.dividendReinvest ? "红利再投资" : "红利现金",
        color: "blue",
      },
    };
    const typeInfo = typeMap[transaction.type] || {
      text: transaction.type,
      color: "default",
    };

    return (
      <Card key={transaction.id} size="small" style={{ marginBottom: 12 }}>
        <Flex
          justify="space-between"
          align="flex-start"
          style={{ marginBottom: 8 }}
        >
          <Space>
            <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(transaction.date).format("YYYY/M/D")}
            </Text>
          </Space>
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(transaction.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Flex>
        <Row gutter={[8, 8]}>
          {transaction.type === "BUY" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>买入金额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  ¥{Number(transaction.amount).toLocaleString()}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Number(transaction.price).toFixed(4)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>份额</div>
                <div style={{ fontSize: 14 }}>
                  {Math.abs(Number(transaction.shares)).toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>差值</div>
                <div style={{ fontSize: 14 }}>
                  {(() => {
                    const currentPriceNum = Number(transaction.price);
                    // 找到所有买入交易，按日期正序排列（最早的在前）
                    const buyTransactions = transactions
                      .filter((t) => t.type === "BUY")
                      .sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime()
                      );
                    const currentIndex = buyTransactions.findIndex(
                      (t) => t.id === transaction.id
                    );

                    if (currentIndex === -1) return "-";

                    // 第一笔交易没有差值
                    if (currentIndex === 0) return "-";

                    // 与上一笔买入交易的净值比较
                    const prevTransaction = buyTransactions[currentIndex - 1];
                    const comparePrice = Number(prevTransaction.price);
                    const diff = currentPriceNum - comparePrice;

                    const diffPercent =
                      comparePrice > 0 ? (diff / comparePrice) * 100 : 0;
                    const color = diff >= 0 ? "#cf1322" : "#3f8600";

                    return (
                      <span style={{ color }}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(4)} ({diff >= 0 ? "+" : ""}
                        {diffPercent.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              </Col>
              {transaction.fee > 0 && (
                <Col span={12}>
                  <div style={{ fontSize: 11, color: "#999" }}>手续费</div>
                  <div style={{ fontSize: 14 }}>
                    ¥{Number(transaction.fee).toFixed(2)}
                  </div>
                </Col>
              )}
            </>
          )}
          {transaction.type === "SELL" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>卖出份额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {Math.abs(Number(transaction.shares)).toFixed(2)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Number(transaction.price).toFixed(4)}
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>卖出金额</div>
                <div style={{ fontSize: 14 }}>
                  ¥{Math.abs(Number(transaction.amount)).toLocaleString()}
                </div>
              </Col>
              {transaction.fee > 0 && (
                <Col span={12}>
                  <div style={{ fontSize: 11, color: "#999" }}>手续费</div>
                  <div style={{ fontSize: 14 }}>
                    ¥{Number(transaction.fee).toFixed(2)}
                  </div>
                </Col>
              )}
            </>
          )}
          {transaction.type === "DIVIDEND" && (
            <>
              <Col span={12}>
                <div style={{ fontSize: 11, color: "#999" }}>分红金额</div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  ¥{Number(transaction.amount).toLocaleString()}
                </div>
              </Col>
              {transaction.dividendReinvest && (
                <>
                  <Col span={12}>
                    <div style={{ fontSize: 11, color: "#999" }}>净值</div>
                    <div style={{ fontSize: 14 }}>
                      ¥{Number(transaction.price).toFixed(4)}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: 11, color: "#999" }}>
                      再投资份额
                    </div>
                    <div style={{ fontSize: 14 }}>
                      {Number(transaction.shares).toFixed(2)}
                    </div>
                  </Col>
                </>
              )}
            </>
          )}
        </Row>
        {transaction.remark && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              background: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12 }}>
              备注：{transaction.remark}
            </Text>
          </div>
        )}
      </Card>
    );
  };

  const columns: ColumnsType<Transaction> = [
    {
      title: "日期",
      dataIndex: "date",
      key: "date",
      width: 110,
      align: "center",
      render: (date: string) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {dayjs(date).format("YYYY/M/D")}
        </span>
      ),
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 90,
      align: "center",
      render: (type: string, record: Transaction) => {
        const typeMap: Record<string, { text: string; color: string }> = {
          BUY: { text: "买入", color: "green" },
          SELL: { text: "卖出", color: "red" },
          DIVIDEND: {
            text: record.dividendReinvest ? "红利再投资" : "红利现金",
            color: "blue",
          },
        };
        const info = typeMap[type] || { text: type, color: "default" };
        return <Tag color={info.color}>{info.text}</Tag>;
      },
    },
    {
      title: "买入金额",
      dataIndex: "amount",
      key: "buyAmount",
      align: "center",
      width: 110,
      render: (amount: number, record: Transaction) =>
        record.type === "BUY" ? `¥${Number(amount).toLocaleString()}` : "-",
    },
    {
      title: "手续费",
      dataIndex: "fee",
      key: "fee",
      align: "center",
      width: 85,
      render: (fee: number) =>
        Number(fee) > 0 ? `¥${Number(fee).toFixed(2)}` : "-",
    },
    {
      title: "净值",
      dataIndex: "price",
      key: "price",
      align: "center",
      width: 90,
      render: (price: number) => Number(price).toFixed(4),
    },
    {
      title: "差值",
      key: "priceDiff",
      align: "center",
      width: 100,
      render: (_: unknown, record: Transaction) => {
        // 只对买入交易显示差值
        if (record.type !== "BUY") {
          return "-";
        }

        const currentPriceNum = Number(record.price);

        // 找到所有买入交易，按日期正序排列（最早的在前）
        const buyTransactions = transactions
          .filter((t) => t.type === "BUY")
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );

        // 找到当前交易在买入交易中的索引
        const currentIndex = buyTransactions.findIndex(
          (t) => t.id === record.id
        );

        if (currentIndex === -1) {
          return "-";
        }

        // 第一笔交易没有差值
        if (currentIndex === 0) {
          return "-";
        }

        // 与上一笔买入交易的净值比较
        const prevTransaction = buyTransactions[currentIndex - 1];
        const comparePrice = Number(prevTransaction.price);
        const diff = currentPriceNum - comparePrice;

        const diffPercent = comparePrice > 0 ? (diff / comparePrice) * 100 : 0;
        const color = diff >= 0 ? "#cf1322" : "#3f8600"; // 正红负绿

        return (
          <div>
            <div style={{ color, fontSize: 13 }}>
              {diff >= 0 ? "+" : ""}
              {diff.toFixed(4)}
            </div>
            <div style={{ color, fontSize: 11, opacity: 0.7 }}>
              ({diff >= 0 ? "+" : ""}
              {diffPercent.toFixed(2)}%)
            </div>
          </div>
        );
      },
    },
    {
      title: "份额",
      dataIndex: "shares",
      key: "shares",
      align: "center",
      width: 110,
      render: (shares: number) => {
        const sharesNum = Number(shares);
        const isNegative = sharesNum < 0;
        return (
          <Text type={isNegative ? "danger" : undefined}>
            {sharesNum.toFixed(2)}
          </Text>
        );
      },
    },
    {
      title: "备注",
      dataIndex: "remark",
      key: "remark",
      align: "center",
      ellipsis: true,
      render: (remark: string) => remark || "-",
    },
    {
      title: "操作",
      key: "action",
      align: "center",
      width: 80,
      render: (_: unknown, record: Transaction) => (
        <Popconfirm
          title="确定要删除吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger icon={<DeleteOutlined />} size="small">
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  // 计算预计信息 (前端模拟后端逻辑)
  const getEstimatedDates = (pt: PendingTransaction, fund: Fund) => {
    // 简单的前端计算，仅供参考，实际以后端为准
    const applyDate = dayjs(pt.applyDate);
    const isAfter3PM = applyDate.hour() >= 15;
    const isWeekend = applyDate.day() === 0 || applyDate.day() === 6;
    
    // 如果是周末或15:00后，视为下一个工作日
    let effectiveDate = applyDate;
    if (isWeekend || isAfter3PM) {
        // 简单处理：往后找工作日（不考虑节假日配置，仅参考）
        do {
            effectiveDate = effectiveDate.add(1, 'day');
        } while (effectiveDate.day() === 0 || effectiveDate.day() === 6);
    }
    
    // 计算确认日 (简单跳过周末)
    let confirmDate = effectiveDate;
    let daysToAdd = fund.confirmDays || 1;
    while (daysToAdd > 0) {
        confirmDate = confirmDate.add(1, 'day');
        if (confirmDate.day() !== 0 && confirmDate.day() !== 6) {
            daysToAdd--;
        }
    }
    
    return {
        effectiveDate: effectiveDate.format('YYYY-MM-DD'),
        confirmDate: confirmDate.format('YYYY-MM-DD'),
        isDelayed: isWeekend || isAfter3PM
    };
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
        {/* 面包屑 - 移动端隐藏 */}
        {!isMobile && (
          <Breadcrumb
            items={[
              {
                title: <Link href="/investment-directions">投资方向</Link>,
              },
              {
                title: (
                  <Link href={`/investment-directions/${fund?.direction.id}`}>
                    {fund?.direction.name}
                  </Link>
                ),
              },
              {
                title: fund?.name || "加载中...",
              },
            ]}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* 顶部信息 */}
        <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
          <Flex
            justify="space-between"
            align={isMobile ? "flex-start" : "center"}
            vertical={isMobile}
            gap={isMobile ? 12 : 0}
          >
            <Flex
              align="center"
              gap="middle"
              wrap="wrap"
              style={{ width: isMobile ? "100%" : "auto" }}
            >
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() =>
                  router.push(`/investment-directions/${fund?.direction.id}`)
                }
                size={isMobile ? "small" : "middle"}
              >
                返回
              </Button>
              <div style={{ flex: isMobile ? 1 : "none" }}>
                <Title level={isMobile ? 4 : 2} style={{ marginBottom: 4 }}>
                  {fund?.name}
                </Title>
                <Space wrap>
                  <Text
                    type="secondary"
                    style={{ fontSize: isMobile ? 12 : 14 }}
                  >
                    代码：{fund?.code}
                  </Text>
                  {fund?.category && <Tag color="blue">{fund.category}</Tag>}
                </Space>
              </div>
            </Flex>
            <Space wrap style={{ width: isMobile ? "100%" : "auto" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => handleOpenModal("BUY")}
                size={isMobile ? "small" : "middle"}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                买入
              </Button>
              <Button
                onClick={() => handleOpenModal("SELL")}
                size={isMobile ? "small" : "middle"}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                卖出
              </Button>
              {stats && stats.holdingShares > 0 && (
                <Button
                  danger
                  onClick={handleLiquidateAll}
                  size={isMobile ? "small" : "middle"}
                  style={{ flex: isMobile ? 1 : "none" }}
                >
                  一键清仓
                </Button>
              )}
              <Button
                onClick={() => handleOpenModal("DIVIDEND")}
                size={isMobile ? "small" : "middle"}
                style={{ flex: isMobile ? 1 : "none" }}
              >
                分红
              </Button>
              {!isMobile && (
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => setPlanModalOpen(true)}
                >
                  计划买入
                </Button>
              )}
            </Space>
          </Flex>
        </Card>

        {/* 持仓统计 */}
        <Card
          title={<span style={{ fontSize: isMobile ? 14 : 16 }}>持仓统计</span>}
          style={{ marginBottom: isMobile ? 12 : 24 }}
          extra={
            isMobile ? null : (
              <Space direction="vertical" size="small" align="end">
                <Space>
                  <Text>当前净值：</Text>
                  <InputNumber
                    value={currentPrice}
                    onChange={(value) => setCurrentPrice(value || 0)}
                    precision={4}
                    min={0}
                    step={0.0001}
                    style={{ width: 120 }}
                    placeholder="净值"
                  />
                  <Button
                    size="small"
                    onClick={() => fund?.code && fetchCurrentPrice(fund.code)}
                    loading={fetchingPrice}
                    disabled={!fund?.code}
                  >
                    获取最新
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => loadTransactions()}
                    disabled={!currentPrice}
                  >
                    刷新
                  </Button>
                </Space>
                {fund?.netWorthDate && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    净值日期：{fund.netWorthDate}
                    {fund.netWorthUpdateAt &&
                      ` (更新于 ${dayjs(fund.netWorthUpdateAt).format(
                        "MM-DD HH:mm"
                      )})`}
                  </Text>
                )}
              </Space>
            )
          }
        >
          {/* 移动端：净值控制区域 */}
          {isMobile && (
            <div
              style={{
                marginBottom: 16,
                padding: "12px",
                background: "#f5f5f5",
                borderRadius: 8,
              }}
            >
              <Space
                direction="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <Flex justify="space-between" align="center">
                  <Text style={{ fontSize: 12 }}>当前净值：</Text>
                  <InputNumber
                    value={currentPrice}
                    onChange={(value) => setCurrentPrice(value || 0)}
                    precision={4}
                    min={0}
                    step={0.0001}
                    style={{ width: 100 }}
                    size="small"
                    placeholder="净值"
                  />
                </Flex>
                <Flex gap={8}>
                  <Button
                    size="small"
                    onClick={() => fund?.code && fetchCurrentPrice(fund.code)}
                    loading={fetchingPrice}
                    disabled={!fund?.code}
                    block
                  >
                    获取最新
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => loadTransactions()}
                    disabled={!currentPrice}
                    block
                  >
                    刷新
                  </Button>
                </Flex>
                {fund?.netWorthDate && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    净值日期：{fund.netWorthDate}
                  </Text>
                )}
              </Space>
            </div>
          )}

          <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]}>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓份额</span>
                }
                value={normalizeZero(stats?.holdingShares)}
                precision={2}
                prefix={<DollarOutlined />}
                styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>
                    持仓成本价
                  </span>
                }
                value={normalizeZero(stats?.avgCostPrice)}
                precision={isMobile ? 2 : 4}
                prefix="¥"
                styles={{
                  content: { color: "#1890ff", fontSize: isMobile ? 16 : 20 },
                }}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓成本</span>
                }
                value={normalizeZero(stats?.holdingCost)}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓市值</span>
                }
                value={normalizeZero(stats?.holdingValue)}
                precision={isMobile ? 0 : 2}
                prefix="¥"
                styles={{
                  content: { color: "#722ed1", fontSize: isMobile ? 16 : 20 },
                }}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>持仓收益</span>
                }
                value={normalizeZero(stats?.holdingProfit)}
                precision={isMobile ? 0 : 2}
                prefix={
                  <span>
                    {normalizeZero(stats?.holdingProfit) >= 0 ? (
                      <RiseOutlined
                        style={{ color: "#cf1322", marginRight: 4 }}
                      />
                    ) : (
                      <FallOutlined
                        style={{ color: "#3f8600", marginRight: 4 }}
                      />
                    )}
                    <span style={{ color: "inherit" }}>¥</span>
                  </span>
                }
                valueStyle={{
                  color:
                    normalizeZero(stats?.holdingProfit) >= 0
                      ? "#cf1322"
                      : "#3f8600",
                  fontSize: isMobile ? 16 : 20,
                }}
              />
            </Col>
            <Col xs={12} sm={12} md={8}>
              <Statistic
                title={
                  <span style={{ fontSize: isMobile ? 12 : 14 }}>收益率</span>
                }
                value={stats?.holdingProfitRate || 0}
                precision={2}
                prefix={
                  (stats?.holdingProfitRate || 0) >= 0 ? (
                    <RiseOutlined style={{ color: "#cf1322" }} />
                  ) : (
                    <FallOutlined style={{ color: "#3f8600" }} />
                  )
                }
                suffix="%"
                valueStyle={{
                  color:
                    (stats?.holdingProfitRate || 0) >= 0
                      ? "#cf1322"
                      : "#3f8600",
                  fontSize: isMobile ? 16 : 20,
                }}
              />
            </Col>
            {(() => {
              // 计算最近一笔买入交易
              const latestBuyTransaction = transactions
                .filter((t) => t.type === "BUY")
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )[0];

              if (!latestBuyTransaction || !currentPrice || currentPrice <= 0) {
                return null;
              }

              const latestBuyPrice = Number(latestBuyTransaction.price);
              const priceDiff = currentPrice - latestBuyPrice;
              const priceDiffPercent =
                latestBuyPrice > 0 ? (priceDiff / latestBuyPrice) * 100 : 0;

              return (
                <Col xs={12} sm={12} md={8}>
                  <Statistic
                    title={
                      <span style={{ fontSize: isMobile ? 12 : 14 }}>
                        最近买入净值
                      </span>
                    }
                    value={latestBuyPrice}
                    precision={4}
                    prefix="¥"
                    styles={{
                      content: {
                        color: "#722ed1",
                        fontSize: isMobile ? 16 : 20,
                      },
                    }}
                    suffix={
                      <div
                        style={{ fontSize: isMobile ? 11 : 12, marginTop: 4 }}
                      >
                        <span
                          style={{
                            color: priceDiff >= 0 ? "#cf1322" : "#3f8600",
                          }}
                        >
                          {priceDiff >= 0 ? "+" : ""}
                          {priceDiff.toFixed(4)} ({priceDiff >= 0 ? "+" : ""}
                          {priceDiffPercent.toFixed(2)}%)
                        </span>
                      </div>
                    }
                  />
                </Col>
              );
            })()}
            {!isMobile && (
              <>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="累计收益"
                    value={stats?.totalProfit || 0}
                    precision={2}
                    prefix={
                      (stats?.totalProfit || 0) >= 0 ? (
                        <RiseOutlined style={{ color: "#cf1322" }} />
                      ) : (
                        <FallOutlined style={{ color: "#3f8600" }} />
                      )
                    }
                    valueStyle={{
                      color:
                        (stats?.totalProfit || 0) >= 0 ? "#cf1322" : "#3f8600",
                    }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="累计收益率"
                    value={stats?.totalProfitRate || 0}
                    precision={2}
                    prefix={
                      (stats?.totalProfitRate || 0) >= 0 ? (
                        <RiseOutlined style={{ color: "#cf1322" }} />
                      ) : (
                        <FallOutlined style={{ color: "#3f8600" }} />
                      )
                    }
                    suffix="%"
                    valueStyle={{
                      color:
                        (stats?.totalProfitRate || 0) >= 0
                          ? "#cf1322"
                          : "#3f8600",
                    }}
                  />
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Statistic
                    title="交易笔数"
                    value={stats?.transactionCount || 0}
                  />
                </Col>
              </>
            )}
          </Row>
        </Card>

        {/* 详细收益明细 */}
        {currentPrice > 0 && (
          <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                收益明细
              </Text>
            </div>
            <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]}>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title={
                    <span style={{ fontSize: isMobile ? 12 : 14 }}>
                      卖出收益
                    </span>
                  }
                  value={stats?.totalSellProfit || 0}
                  precision={isMobile ? 0 : 2}
                  prefix={
                    <span>
                      {(stats?.totalSellProfit || 0) >= 0 ? (
                        <RiseOutlined
                          style={{ color: "#cf1322", marginRight: 4 }}
                        />
                      ) : (
                        <FallOutlined
                          style={{ color: "#3f8600", marginRight: 4 }}
                        />
                      )}
                      <span style={{ color: "inherit" }}>¥</span>
                    </span>
                  }
                  styles={{
                    content: {
                      color:
                        (stats?.totalSellProfit || 0) >= 0
                          ? "#cf1322"
                          : "#3f8600",
                      fontSize: isMobile ? 16 : 20,
                    },
                  }}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title={
                    <span style={{ fontSize: isMobile ? 12 : 14 }}>
                      现金分红
                    </span>
                  }
                  value={stats?.totalDividendCash || 0}
                  precision={isMobile ? 0 : 2}
                  prefix="¥"
                  styles={{
                    content: { color: "#52c41a", fontSize: isMobile ? 16 : 20 },
                  }}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title={
                    <span style={{ fontSize: isMobile ? 12 : 14 }}>
                      再投资分红
                    </span>
                  }
                  value={stats?.totalDividendReinvest || 0}
                  precision={isMobile ? 0 : 2}
                  prefix="¥"
                  styles={{
                    content: { color: "#1890ff", fontSize: isMobile ? 16 : 20 },
                  }}
                />
              </Col>
              <Col xs={12} sm={12} md={6}>
                <Statistic
                  title={
                    <span style={{ fontSize: isMobile ? 12 : 14 }}>
                      交易笔数
                    </span>
                  }
                  value={stats?.transactionCount || 0}
                  suffix="笔"
                  styles={{ content: { fontSize: isMobile ? 16 : 20 } }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* 备注 */}
        {fund?.remark && (
          <Card style={{ marginBottom: isMobile ? 12 : 24 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>备注：</Text>
            </div>
            <Text type="secondary">{fund.remark}</Text>
          </Card>
        )}

        {/* 计划买入列表 */}
        {plannedPurchases.length > 0 && (
          <Card
            title={
              <Space wrap>
                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                  计划买入
                </Text>
                <Tag color="orange">待执行</Tag>
              </Space>
            }
            style={{ marginBottom: isMobile ? 12 : 24 }}
            extra={
              <Button
                type="primary"
                size={isMobile ? "small" : "small"}
                icon={<PlusOutlined />}
                onClick={() => setPlanModalOpen(true)}
              >
                {isMobile ? "新建" : "新建计划"}
              </Button>
            }
          >
            <Space
              direction="vertical"
              style={{ width: "100%" }}
              size={isMobile ? "small" : "middle"}
            >
              {plannedPurchases.map((plan) => (
                <Card key={plan.id} size="small">
                  {isMobile ? (
                    // 移动端：垂直布局
                    <div>
                      <Flex
                        justify="space-between"
                        align="flex-start"
                        style={{ marginBottom: 12 }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#999",
                              marginBottom: 4,
                            }}
                          >
                            计划金额
                          </div>
                          <div
                            style={{
                              fontSize: 18,
                              fontWeight: 500,
                              color: "#1890ff",
                            }}
                          >
                            ¥{Number(plan.plannedAmount).toLocaleString()}
                          </div>
                        </div>
                        <Popconfirm
                          title="确定要删除吗？"
                          onConfirm={() => handleDeletePlan(plan.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            type="text"
                          />
                        </Popconfirm>
                      </Flex>
                      <div style={{ marginBottom: 12 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: "#999",
                            marginBottom: 4,
                          }}
                        >
                          创建时间
                        </div>
                        <div style={{ fontSize: 12 }}>
                          {dayjs(plan.createdAt).format("YYYY-MM-DD")}
                        </div>
                      </div>
                      <Button
                        type="primary"
                        onClick={() => handleOpenExecuteModal(plan)}
                        block
                        size={isMobile ? "small" : "middle"}
                      >
                        执行买入
                      </Button>
                    </div>
                  ) : (
                    // 桌面端：水平布局
                    <Flex justify="space-between" align="center">
                      <Space size="large">
                        <Statistic
                          title="计划金额"
                          value={plan.plannedAmount}
                          precision={2}
                          prefix="¥"
                          valueStyle={{ fontSize: 20 }}
                        />
                        <div>
                          <Text type="secondary">创建时间</Text>
                          <br />
                          <Text>
                            {dayjs(plan.createdAt).format("YYYY-MM-DD")}
                          </Text>
                        </div>
                      </Space>
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => handleOpenExecuteModal(plan)}
                        >
                          执行买入
                        </Button>
                        <Popconfirm
                          title="确定要删除吗？"
                          onConfirm={() => handleDeletePlan(plan.id)}
                          okText="确定"
                          cancelText="取消"
                        >
                          <Button danger icon={<DeleteOutlined />}>
                            删除
                          </Button>
                        </Popconfirm>
                      </Space>
                    </Flex>
                  )}
                </Card>
              ))}
            </Space>
          </Card>
        )}

        {/* 待确认交易列表 */}
        {pendingTransactions.length > 0 && (
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span style={{ fontSize: isMobile ? 14 : 16 }}>待确认交易</span>
              </Space>
            }
            style={{ marginBottom: isMobile ? 12 : 24 }}
            extra={
               <Button
                  type="primary"
                  size="small"
                  icon={<SyncOutlined spin={confirmLoading} />}
                  onClick={handleBatchConfirm}
                  loading={confirmLoading}
                >
                  检查转正
                </Button>
            }
          >
             <Table
               columns={[
                 { 
                   title: '申请日期', 
                   dataIndex: 'applyDate', 
                   key: 'applyDate',
                   render: (d: string) => dayjs(d).format('YYYY-MM-DD HH:mm') 
                 },
                 { 
                   title: '类型', 
                   dataIndex: 'type', 
                   key: 'type',
                   render: (t: string) => (
                     <Tag color={t==='BUY'?'green':'red'}>{t==='BUY'?'买入':'卖出'}</Tag>
                   ) 
                 },
                 { 
                   title: '申请内容', 
                   key: 'content',
                   render: (_: unknown, r: PendingTransaction) => (
                     r.type==='BUY' 
                       ? `¥${Number(r.applyAmount).toLocaleString()}` 
                       : `${Number(r.applyShares)}份`
                   ) 
                 },
                 {
                   title: '预计买入日期',
                   key: 'estimatedBuyDate',
                   render: (_: unknown, r: PendingTransaction) => {
                       // 简单估算：如果是15点后或周末，视为下一个工作日
                       const applyDate = dayjs(r.applyDate);
                       // 0=周日, 6=周六
                       const isWeekend = applyDate.day() === 0 || applyDate.day() === 6;
                       const isAfter3PM = applyDate.hour() >= 15;
                       
                       // 计算有效申请日（买入日）
                       let effectiveDate = applyDate;
                       
                       // 如果是周末，或者是15点后，都要往后找工作日
                       if (isWeekend || isAfter3PM) {
                           do {
                               effectiveDate = effectiveDate.add(1, 'day');
                           } while (effectiveDate.day() === 0 || effectiveDate.day() === 6);
                       }
                       
                       return (
                           <Tooltip title={isAfter3PM ? "超过15:00顺延" : (isWeekend ? "非交易日顺延" : "")}>
                               <span>{effectiveDate.format('YYYY-MM-DD')}</span>
                               {(isAfter3PM || isWeekend) && <Text type="secondary" style={{fontSize: 12, marginLeft: 4}}>(顺延)</Text>}
                           </Tooltip>
                       );
                   }
                 },
                 {
                   title: '预计确认日期',
                   key: 'estimatedConfirmDate',
                   render: (_: unknown, r: PendingTransaction) => {
                       // 简单估算
                       const applyDate = dayjs(r.applyDate);
                       const isWeekend = applyDate.day() === 0 || applyDate.day() === 6;
                       const isAfter3PM = applyDate.hour() >= 15;
                       
                       let effectiveDate = applyDate;
                       if (isWeekend || isAfter3PM) {
                           do {
                               effectiveDate = effectiveDate.add(1, 'day');
                           } while (effectiveDate.day() === 0 || effectiveDate.day() === 6);
                       }
                       
                       let confirmDate = effectiveDate;
                       let days = fund?.confirmDays || 1;
                       while (days > 0) {
                           confirmDate = confirmDate.add(1, 'day');
                           if (confirmDate.day() !== 0 && confirmDate.day() !== 6) {
                               days--;
                           }
                       }
                       
                       return confirmDate.format('YYYY-MM-DD');
                   }
                 },
                 { 
                   title: '状态', 
                   dataIndex: 'status', 
                   key: 'status',
                   render: () => <Tag color="orange">等待净值</Tag> 
                 },
                 { 
                   title: '操作', 
                   key: 'action',
                   render: (_: unknown, r: PendingTransaction) => (
                     <Popconfirm title="确定撤销吗？" onConfirm={() => handleDeletePending(r.id)}>
                        <Button type="link" danger size="small">撤销</Button>
                     </Popconfirm>
                   ) 
                 }
               ]}
               dataSource={pendingTransactions}
               rowKey="id"
               pagination={false}
               size="small"
             />
          </Card>
        )}

        {/* 交易记录 */}
        <Card
          title={
            <span
              style={{ fontSize: isMobile ? 14 : 16 }}
            >{`交易记录（${transactions.length}笔）`}</span>
          }
          style={{ marginBottom: isMobile ? 12 : 24 }}
          extra={
            isMobile && (
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setPlanModalOpen(true)}
              >
                计划买入
              </Button>
            )
          }
        >
          {isMobile ? (
            // 移动端：卡片列表
            <div>
              {transactions.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "#999",
                  }}
                >
                  暂无交易记录
                </div>
              ) : (
                transactions.map((transaction) =>
                  renderMobileTransactionCard(transaction)
                )
              )}
            </div>
          ) : (
            // 桌面端：表格
            <Table
              columns={columns}
              dataSource={transactions}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
            />
          )}
        </Card>

        {/* 交易弹窗 */}
        <Modal
          title={
            transactionType === "BUY"
              ? "买入"
              : transactionType === "SELL"
              ? "卖出"
              : "分红"
          }
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={isMobile ? "90%" : 600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            style={{ marginTop: 24 }}
          >
            <Form.Item name="type" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              label="交易日期"
              name="date"
              rules={[{ required: true, message: "请选择交易日期" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                placeholder="选择日期"
              />
            </Form.Item>

            {transactionType !== "DIVIDEND" && (
              <Form.Item style={{ marginBottom: 12 }}>
                <Space>
                  <Form.Item name="isPending" valuePropName="checked" noStyle>
                    <Checkbox>
                      <Tooltip title="勾选后只需输入金额/份额，系统会在确认日自动匹配净值转为正式交易">
                        待确认交易 (等待净值) <ClockCircleOutlined />
                      </Tooltip>
                    </Checkbox>
                  </Form.Item>
                  {isPending && (
                    <Form.Item name="afterThreePM" valuePropName="checked" noStyle>
                      <Checkbox>
                        <Tooltip title="如果是在交易日15:00之后的操作，请勾选此项，系统会自动顺延到下一个交易日处理">
                          15:00后交易 <ClockCircleOutlined />
                        </Tooltip>
                      </Checkbox>
                    </Form.Item>
                  )}
                </Space>
              </Form.Item>
            )}

            {transactionType === "BUY" && (
              <>
                <Row gutter={16}>
                  <Col span={isPending ? 24 : 12}>
                    <Form.Item
                      label="买入金额"
                      name="amount"
                      rules={[{ required: true, message: "请输入买入金额" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="输入金额"
                        prefix="¥"
                      />
                    </Form.Item>
                  </Col>
                  {!isPending && (
                    <Col span={12}>
                      <Form.Item
                        label="手续费"
                        name="fee"
                        tooltip="手续费将从买入金额中扣除"
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          precision={2}
                          placeholder="输入手续费"
                          prefix="¥"
                        />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                {!isPending && (
                  <Form.Item
                    label="买入净值"
                    name="price"
                    rules={[{ required: true, message: "请输入买入净值" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={4}
                      placeholder="输入净值"
                    />
                  </Form.Item>
                )}
              </>
            )}

            {transactionType === "SELL" && (
              <>
                <Row gutter={16}>
                  <Col span={isPending ? 24 : 12}>
                    <Form.Item
                      label="卖出份额"
                      name="shares"
                      rules={[{ required: true, message: "请输入卖出份额" }]}
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="输入份额"
                      />
                    </Form.Item>
                  </Col>
                  {!isPending && (
                    <Col span={12}>
                      <Form.Item
                        label="手续费"
                        name="fee"
                        tooltip="手续费将从卖出金额中扣除"
                      >
                        <InputNumber
                          style={{ width: "100%" }}
                          min={0}
                          precision={2}
                          placeholder="输入手续费"
                          prefix="¥"
                        />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
                {!isPending && (
                  <Form.Item
                    label="卖出净值"
                    name="price"
                    rules={[{ required: true, message: "请输入卖出净值" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={4}
                      placeholder="输入净值"
                    />
                  </Form.Item>
                )}
              </>
            )}

            {transactionType === "DIVIDEND" && (
              <>
                <Form.Item
                  label="分红类型"
                  name="dividendReinvest"
                  rules={[{ required: true, message: "请选择分红类型" }]}
                >
                  <Radio.Group
                    onChange={(e) => {
                      // 当切换分红类型时，清空相关字段
                      if (e.target.value === false) {
                        // 现金分红：清除净值和份数字段
                        form.setFieldValue("price", undefined);
                        form.setFieldValue("dividendShares", undefined);
                      } else {
                        // 分红再投资：清空分红金额，因为会自动计算
                        form.setFieldValue("amount", undefined);
                      }
                    }}
                  >
                    <Radio value={false}>现金分红</Radio>
                    <Radio value={true}>分红再投资</Radio>
                  </Radio.Group>
                </Form.Item>

                {dividendReinvest ? (
                  // 分红再投资：输入份数，自动计算金额
                  <>
                    <Form.Item
                      label="再投资份数"
                      name="dividendShares"
                      rules={[{ required: true, message: "请输入再投资份数" }]}
                      tooltip="从支付宝等平台查看分红后增加的份数"
                    >
                      <InputNumber
                        style={{ width: "100%" }}
                        min={0}
                        precision={2}
                        placeholder="输入再投资的份数"
                      />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          label="当日净值"
                          name="price"
                          tooltip="系统会根据日期自动获取，也可手动修改"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            precision={4}
                            placeholder="自动获取"
                            disabled={fetchingHistoryPrice}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          label="分红金额"
                          name="amount"
                          tooltip="根据份数和净值自动计算"
                        >
                          <InputNumber
                            style={{ width: "100%" }}
                            min={0}
                            precision={2}
                            placeholder="自动计算"
                            prefix="¥"
                            disabled
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ) : (
                  // 现金分红：直接输入金额
                  <Form.Item
                    label="分红金额"
                    name="amount"
                    rules={[{ required: true, message: "请输入分红金额" }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      precision={2}
                      placeholder="输入金额"
                      prefix="¥"
                    />
                  </Form.Item>
                )}
              </>
            )}

            <Form.Item label="备注" name="remark">
              <TextArea rows={2} placeholder="输入备注（可选）" />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  确定
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>

        {/* 新建计划买入弹窗 */}
        <Modal
          title="新建计划买入"
          open={planModalOpen}
          onCancel={() => {
            setPlanModalOpen(false);
            planForm.resetFields();
          }}
          footer={null}
          width={isMobile ? "90%" : 500}
        >
          <Form
            form={planForm}
            layout="vertical"
            onFinish={handleCreatePlan}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="计划买入金额"
              name="plannedAmount"
              rules={[{ required: true, message: "请输入计划买入金额" }]}
              tooltip="设置一个预期买入的金额，等时机合适时再执行"
            >
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                precision={2}
                placeholder="输入金额"
                prefix="¥"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setPlanModalOpen(false)}>取消</Button>
                <Button type="primary" htmlType="submit">
                  创建
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>

        {/* 执行计划买入弹窗 */}
        <Modal
          title="执行计划买入"
          open={executePlanModalOpen}
          onCancel={() => {
            setExecutePlanModalOpen(false);
            executeForm.resetFields();
          }}
          footer={null}
          width={isMobile ? "90%" : 600}
        >
          <Form
            form={executeForm}
            layout="vertical"
            onFinish={handleExecutePlan}
            style={{ marginTop: 24 }}
          >
            <Form.Item
              label="计划金额"
              name="plannedAmount"
              tooltip="这是之前设置的计划金额"
            >
              <InputNumber
                style={{ width: "100%" }}
                disabled
                prefix="¥"
                size="large"
              />
            </Form.Item>

            <Form.Item
              label="买入日期"
              name="date"
              rules={[{ required: true, message: "请选择买入日期" }]}
            >
              <DatePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                placeholder="选择日期"
                size="large"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="买入净值"
                  name="price"
                  rules={[{ required: true, message: "请输入买入净值" }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={4}
                    placeholder="输入净值"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="手续费" name="fee">
                  <InputNumber
                    style={{ width: "100%" }}
                    min={0}
                    precision={2}
                    placeholder="输入手续费"
                    prefix="¥"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
              <Flex justify="flex-end" gap="small">
                <Button onClick={() => setExecutePlanModalOpen(false)}>
                  取消
                </Button>
                <Button type="primary" htmlType="submit">
                  确认执行
                </Button>
              </Flex>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}
