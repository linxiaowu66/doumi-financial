"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import { Form, message } from "antd";
import { useRouter } from "next/navigation";
import {
  InvestmentDirection,
  Fund,
  FundStats,
  CategoryTarget,
  DirectionSummary,
  FundAlert,
  CategoryPositionAlert,
} from "@/types/investment-direction-detail";
import Header from "@/components/investment-direction-detail/Header";
import StatsCards from "@/components/investment-direction-detail/StatsCards";
import ProfitChart from "@/components/investment-direction-detail/ProfitChart";
import RecentTransactions from "@/components/investment-direction-detail/RecentTransactions";
import IncomeSummary from "@/components/investment-direction-detail/IncomeSummary";
import FundList from "@/components/investment-direction-detail/FundList";
import FundModal from "@/components/investment-direction-detail/FundModal";
import TargetModal from "@/components/investment-direction-detail/TargetModal";

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

  // 处理 URL hash 锚点定位（优先级高于滚动位置恢复）
  useEffect(() => {
    if (loading || funds.length === 0) return;

    const hash = window.location.hash;
    if (hash) {
      // 延迟定位，确保页面内容已渲染
      const timer = setTimeout(() => {
        const elementId = hash.substring(1); // 移除 # 号
        const element = document.getElementById(elementId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
          // 清除 sessionStorage 中的滚动位置，避免冲突
          const scrollKey = `scroll-position-${directionId}`;
          sessionStorage.removeItem(scrollKey);
        }
      }, 500);
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
        setCategoryTargets([]);
        return;
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setCategoryTargets(data);
      } else {
        setCategoryTargets([]);
      }
    } catch (error) {
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
        // 找到该分类下所有基金的最后一次买入交易（仅考虑未清仓的基金）
        let categoryLastBuyDate: Date | null = null;

        categoryFunds.forEach((fund) => {
          if (!fund.transactions || fund.transactions.length === 0) {
            return;
          }

          // 检查该基金是否已清仓
          const stats = statsMap.get(fund.id);
          if (isFundLiquidated(stats)) {
            return; // 跳过已清仓的基金
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
        message.warning(data.error || "加载图表数据失败");
      }
    } catch (error) {
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
        confirmDays: fund.confirmDays || 1,
        defaultBuyFee: fund.defaultBuyFee || 0.15,
        defaultSellFee: fund.defaultSellFee || 0.50,
      });
    } else {
      setEditingFund(null);
      form.resetFields();
      form.setFieldsValue({
        confirmDays: 1,
        defaultBuyFee: 0.15,
        defaultSellFee: 0.50,
      });
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

  // 计算总计
  const totalHoldingCost = Array.from(fundsStats.values()).reduce(
    (sum, stats) => sum + stats.holdingCost,
    0
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: isMobile ? "8px" : "32px",
        background: "#f5f5f5",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <Header
          direction={direction}
          isMobile={isMobile}
          onOpenModal={() => handleOpenModal()}
        />

        <StatsCards
          direction={direction}
          fundsCount={funds.length}
          totalHoldingCost={totalHoldingCost}
          isMobile={isMobile}
        />

        <ProfitChart
          chartData={chartData}
          chartDays={chartDays}
          chartLoading={chartLoading}
          isMobile={isMobile}
          onChartDaysChange={setChartDays}
        />

        <RecentTransactions funds={funds} isMobile={isMobile} />

        <IncomeSummary summary={summary} onRefresh={loadSummary} />

        <FundList
          funds={funds}
          fundsStats={fundsStats}
          categoryTargets={categoryTargets}
          direction={direction}
          categoryAlerts={categoryAlerts}
          categoryPositionAlerts={categoryPositionAlerts}
          loading={loading}
          isMobile={isMobile}
          onOpenModal={handleOpenModal}
          onDelete={handleDelete}
          onOpenTargetModal={handleOpenTargetModal}
          isFundLiquidated={isFundLiquidated}
        />

        <FundModal
          open={modalOpen}
          editingFund={editingFund}
          categoryOptions={categoryOptions}
          categorySearchValue={categorySearchValue}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
          }}
          onFinish={handleSubmit}
          onSearchCategory={setCategorySearchValue}
          onCategorySelect={() => setCategorySearchValue("")}
          onCategoryClear={() => setCategorySearchValue("")}
          form={form}
          onKeyDown={(e: React.KeyboardEvent) => {
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
          onBlur={() => {
            if (categorySearchValue && categorySearchValue.trim() !== "") {
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
                  return newOptions.sort((a, b) =>
                    a.value.localeCompare(b.value)
                  );
                });
                form.setFieldValue("category", trimmedValue);
              }
              setCategorySearchValue("");
            }
          }}
        />

        <TargetModal
          open={targetModalOpen}
          editingCategory={editingCategory}
          direction={direction}
          onCancel={() => {
            setTargetModalOpen(false);
            targetForm.resetFields();
          }}
          onFinish={handleSaveTarget}
          form={targetForm}
        />
      </div>
    </div>
  );
}