"use client";

import { useState, useEffect, use, useCallback } from "react";
import { Form, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import {
  Fund,
  FundStats,
  Transaction,
  PendingTransaction,
  PlannedPurchase,
} from "@/types/fund";
import FundHeader from "@/components/funds/FundHeader";
import FundStatsCard from "@/components/funds/FundStatsCard";
import FundIncome from "@/components/funds/FundIncome";
import PlannedPurchaseList from "@/components/funds/PlannedPurchaseList";
import PendingTransactionList from "@/components/funds/PendingTransactionList";
import TransactionList from "@/components/funds/TransactionList";
import TransactionModal from "@/components/funds/TransactionModal";
import PlannedPurchaseModal from "@/components/funds/PlannedPurchaseModal";
import ExecutePlanModal from "@/components/funds/ExecutePlanModal";

export default function FundDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const fundId = parseInt(resolvedParams.id);

  const [fund, setFund] = useState<Fund | null>(null);
  const [stats, setStats] = useState<FundStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<
    PendingTransaction[]
  >([]);
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
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [transactionType, setTransactionType] = useState<string>("BUY");
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
    async (code?: string) => {
      // Allow passing code or use state if not passed (though state might not be ready)
      // Actually code is passed from caller usually
      const fundCode = code || fund?.code;
      if (!fundCode) return;

      setFetchingPrice(true);
      try {
        const response = await fetch(`/api/fund-price?code=${fundCode}`);
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
    [fundId, fund?.code]
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

          // 只在精确匹配时显示成功消息
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
    setEditingTransactionId(null); // 清除编辑状态
    form.resetFields();
    form.setFieldsValue({
      type,
      date: dayjs(),
    });
    setModalOpen(true);
  };

  // 编辑交易
  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionType(transaction.type);
    setEditingTransactionId(transaction.id);
    form.resetFields();
    
    // 填充表单
    const values: any = {
      type: transaction.type,
      date: dayjs(transaction.date),
      price: Number(transaction.price),
      fee: Number(transaction.fee),
      remark: transaction.remark,
      dividendReinvest: transaction.dividendReinvest,
    };

    if (transaction.type === 'BUY') {
      values.amount = Number(transaction.amount); // 这里 amount 已经是总支出
    } else if (transaction.type === 'SELL') {
      values.shares = Math.abs(Number(transaction.shares));
      // 卖出时 amount 是净收入，但在界面上我们通常不显示这个字段让用户改，
      // 而是通过 shares * price - fee 自动计算，或者用户输入 shares 和 price。
      // 所以不需要填充 amount
    } else if (transaction.type === 'DIVIDEND') {
      values.amount = Number(transaction.amount);
      if (transaction.dividendReinvest) {
        values.dividendShares = Number(transaction.shares);
      }
    }

    form.setFieldsValue(values);
    setModalOpen(true);
  };

  // 一键清仓
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
    setEditingTransactionId(null);
    form.resetFields();
    form.setFieldsValue({
      type: "SELL",
      date: dayjs(),
      shares: Number(stats.holdingShares.toFixed(2)),
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
    dividendShares?: number;
    remark: string;
    isPending?: boolean;
    afterThreePM?: boolean;
  }) => {
    try {
      if (values.isPending) {
        // 待确认交易逻辑
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
            applyAmount: values.type === "BUY" ? values.amount : undefined,
            applyShares: values.type === "SELL" ? values.shares : undefined,
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
        const netAmount = values.amount - (values.fee || 0);
        calculatedShares = netAmount / values.price;
        calculatedAmount = values.amount;
      } else if (values.type === "SELL") {
        calculatedAmount = values.shares * values.price - (values.fee || 0);
        calculatedShares = -Math.abs(values.shares);
      } else if (values.type === "DIVIDEND") {
        calculatedAmount = values.amount;
        if (values.dividendReinvest) {
          calculatedShares = values.dividendShares || 0;
          if (!calculatedAmount && values.price) {
            calculatedAmount = calculatedShares * values.price;
          }
        } else {
          calculatedShares = 0;
        }
      }

      const payload = {
        fundId,
        type: values.type,
        amount: calculatedAmount,
        shares: calculatedShares,
        price:
          values.type === "DIVIDEND" && !values.dividendReinvest
            ? 0
            : values.price,
        fee: values.fee || 0,
        date: values.date.toISOString(),
        dividendReinvest: values.dividendReinvest || false,
        remark: values.remark,
      };

      let response;
      if (editingTransactionId) {
        // 编辑模式 (PUT)
        response = await fetch(`/api/transactions/${editingTransactionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // 新增模式 (POST)
        response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        message.success(editingTransactionId ? "交易记录更新成功" : "交易记录添加成功");
        setModalOpen(false);
        setEditingTransactionId(null);
        form.resetFields();
        loadTransactions();
      } else {
        message.error(editingTransactionId ? "更新失败" : "添加失败");
      }
    } catch {
      message.error("操作失败");
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
        loadFund();
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
          data.logs?.filter(
            (l: string) =>
              l.includes("成功转正") || l.includes("Confirmed")
          ).length || 0;

        if (confirmedCount > 0) {
          message.success(`成功确认 ${confirmedCount} 笔交易`);
          loadFund();
          loadTransactions();
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

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: isMobile ? "8px" : "32px",
        background: "#f5f5f5",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <FundHeader
          fund={fund}
          stats={stats}
          isMobile={isMobile}
          onOpenModal={handleOpenModal}
          onLiquidateAll={handleLiquidateAll}
          onPlanModalOpen={() => setPlanModalOpen(true)}
        />

        <FundStatsCard
          fund={fund}
          stats={stats}
          transactions={transactions}
          currentPrice={currentPrice}
          isMobile={isMobile}
          fetchingPrice={fetchingPrice}
          onPriceChange={setCurrentPrice}
          onFetchPrice={() => fund?.code && fetchCurrentPrice(fund.code)}
          onRefresh={loadTransactions}
          normalizeZero={normalizeZero}
        />

        <FundIncome
          stats={stats}
          isMobile={isMobile}
          currentPrice={currentPrice}
        />

        <PlannedPurchaseList
          plannedPurchases={plannedPurchases}
          isMobile={isMobile}
          onPlanModalOpen={() => setPlanModalOpen(true)}
          onDeletePlan={handleDeletePlan}
          onOpenExecuteModal={handleOpenExecuteModal}
        />

        <PendingTransactionList
          pendingTransactions={pendingTransactions}
          fund={fund}
          isMobile={isMobile}
          confirmLoading={confirmLoading}
          onBatchConfirm={handleBatchConfirm}
          onDeletePending={handleDeletePending}
        />

        <TransactionList
          transactions={transactions}
          loading={loading}
          isMobile={isMobile}
          onPlanModalOpen={() => setPlanModalOpen(true)}
          onDelete={handleDelete}
          onEdit={handleEditTransaction}
        />

        <TransactionModal
          open={modalOpen}
          onCancel={() => {
            setModalOpen(false);
            setEditingTransactionId(null);
            form.resetFields();
          }}
          onFinish={handleSubmit}
          transactionType={transactionType}
          form={form}
          isPending={isPending}
          afterThreePM={afterThreePM}
          dividendReinvest={dividendReinvest}
          fetchingHistoryPrice={fetchingHistoryPrice}
          isMobile={isMobile}
          isEditing={!!editingTransactionId}
        />

        <PlannedPurchaseModal
          open={planModalOpen}
          onCancel={() => {
            setPlanModalOpen(false);
            planForm.resetFields();
          }}
          onFinish={handleCreatePlan}
          form={planForm}
          isMobile={isMobile}
        />

        <ExecutePlanModal
          open={executePlanModalOpen}
          onCancel={() => {
            setExecutePlanModalOpen(false);
            executeForm.resetFields();
          }}
          onFinish={handleExecutePlan}
          form={executeForm}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}