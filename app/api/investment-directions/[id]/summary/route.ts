import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateDirectionDailyProfit } from "@/lib/direction-daily-profit";
import { Decimal } from "@prisma/client/runtime/library";

// GET - 获取投资方向汇总统计
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const directionId = parseInt(id);

    // 获取投资方向信息
    const direction = await prisma.investmentDirection.findUnique({
      where: { id: directionId },
      include: {
        funds: {
          include: {
            transactions: {
              orderBy: { date: "asc" },
            },
          },
        },
      },
    });

    if (!direction) {
      return NextResponse.json({ error: "投资方向不存在" }, { status: 404 });
    }

    // 初始化统计数据
    // 总投入：历史上所有买入交易的金额总和（包括已清仓的基金），用于计算累计收益率
    let totalInvested = new Decimal(0);
    let totalCurrentValue = new Decimal(0); // 当前总市值
    let totalCost = new Decimal(0); // 持仓总成本（当前持仓的成本，不包括已清仓的基金）
    let totalSellProfit = new Decimal(0); // 累计卖出收益
    let totalDividendCash = new Decimal(0); // 累计现金分红
    let totalDividendReinvest = new Decimal(0); // 累计分红再投资

    // 遍历每只基金计算统计
    for (const fund of direction.funds) {
      let fundShares = new Decimal(0);
      let fundCost = new Decimal(0);
      let fundSellProfit = new Decimal(0);
      let fundDividendCash = new Decimal(0);
      let fundDividendReinvest = new Decimal(0);

      for (const tx of fund.transactions) {
        const amount = new Decimal(tx.amount.toString());
        const shares = new Decimal(tx.shares.toString());
        const price = new Decimal(tx.price.toString());
        const fee = new Decimal(tx.fee.toString());

        if (tx.type === "BUY") {
          // 买入：增加份额和成本
          fundShares = fundShares.plus(shares);
          fundCost = fundCost.plus(amount);
          // 累加总投入（包括已清仓的基金，用于计算累计收益率）
          totalInvested = totalInvested.plus(amount);
        } else if (tx.type === "SELL") {
          // 卖出：减少份额和成本
          const sellShares = shares.abs();
          const avgCostPrice = fundShares.isZero()
            ? new Decimal(0)
            : fundCost.dividedBy(fundShares);
          const costOfSold = avgCostPrice.times(sellShares);

          fundShares = fundShares.minus(sellShares);
          fundCost = fundCost.minus(costOfSold);

          // 卖出收益 = 卖出金额 - 成本 - 手续费
          const sellRevenue = sellShares.times(price).minus(fee);
          const sellProfit = sellRevenue.minus(costOfSold);
          fundSellProfit = fundSellProfit.plus(sellProfit);
        } else if (tx.type === "DIVIDEND") {
          // 分红
          if (tx.dividendReinvest) {
            // 分红再投资：增加份额，但不增加成本
            fundShares = fundShares.plus(shares);
            fundDividendReinvest = fundDividendReinvest.plus(amount);
          } else {
            // 现金分红：不影响份额和成本
            fundDividendCash = fundDividendCash.plus(amount);
          }
        }
      }

      // 处理精度问题：如果份额接近0，直接设为0（同时成本也设为0）
      // 使用更大的阈值（0.03），因为实际计算中可能产生 -0.0039 这样的值
      const PRECISION_THRESHOLD = new Decimal("0.03");
      if (fundShares.abs().lessThan(PRECISION_THRESHOLD)) {
        fundShares = new Decimal(0);
        fundCost = new Decimal(0);
      }

      // 累加到总统计
      totalCost = totalCost.plus(fundCost);
      totalSellProfit = totalSellProfit.plus(fundSellProfit);
      totalDividendCash = totalDividendCash.plus(fundDividendCash);
      totalDividendReinvest = totalDividendReinvest.plus(fundDividendReinvest);

      // 计算当前市值（使用最新净值）
      if (fund.latestNetWorth && fundShares.greaterThan(0)) {
        const currentPrice = new Decimal(fund.latestNetWorth.toString());
        const fundValue = fundShares.times(currentPrice);
        totalCurrentValue = totalCurrentValue.plus(fundValue);
      }
    }

    // 处理精度问题：确保接近0的值都设为0
    const PRECISION_THRESHOLD = new Decimal("0.03");
    if (totalCost.abs().lessThan(PRECISION_THRESHOLD)) {
      totalCost = new Decimal(0);
    }
    if (totalCurrentValue.abs().lessThan(PRECISION_THRESHOLD)) {
      totalCurrentValue = new Decimal(0);
    }

    // 计算收益指标
    const holdingProfit = totalCurrentValue.minus(totalCost); // 持仓收益
    const totalProfit = holdingProfit
      .plus(totalSellProfit)
      .plus(totalDividendCash)
      .plus(totalDividendReinvest); // 累计总收益

    const totalProfitRate = totalInvested.isZero()
      ? new Decimal(0)
      : totalProfit.dividedBy(totalInvested).times(100); // 累计收益率

    // 处理负数零的工具函数
    // 使用更大的阈值（0.03），确保接近0的值都被归一化
    const normalizeZero = (value: Decimal): string => {
      const num = parseFloat(value.toString());
      const normalized = Math.abs(num) < 0.03 ? 0 : num;
      return normalized.toFixed(2);
    };

    // 返回统计结果
    return NextResponse.json({
      directionId,
      directionName: direction.name,
      expectedAmount: direction.expectedAmount.toString(),
      actualAmount: direction.actualAmount.toString(),
      totalInvested: normalizeZero(totalInvested), // 历史总投入（所有买入金额总和，包括已清仓的基金）
      totalCurrentValue: normalizeZero(totalCurrentValue), // 当前总市值
      totalCost: normalizeZero(totalCost), // 持仓总成本
      holdingProfit: normalizeZero(holdingProfit), // 持仓收益
      // 计算并返回昨日盈亏（基于已保存的 direction_daily_profit 或即时计算）
      yesterdayProfit: await (async () => {
        try {
          const res = await calculateDirectionDailyProfit(
            directionId,
            new Date(),
          );
          return res.dailyProfit.toFixed(2);
        } catch (err) {
          return "0.00";
        }
      })(),
      // 计算年化收益（CAGR），基于累计收益率和最早一次买入时间
      annualYield: ((): string => {
        try {
          const rate = totalProfitRate; // Decimal
          const factor = 1 + parseFloat(rate.toString()) / 100;
          // 找到最早的 BUY 交易时间
          let earliestBuy: Date | null = null;
          for (const fund of direction.funds) {
            if (!fund.transactions || fund.transactions.length === 0) continue;
            const buys = fund.transactions.filter((t: any) => t.type === "BUY");
            if (buys.length === 0) continue;
            const first = buys.sort(
              (a: any, b: any) =>
                new Date(a.date).getTime() - new Date(b.date).getTime(),
            )[0];
            const d = new Date(first.date);
            if (!earliestBuy || d < earliestBuy) earliestBuy = d;
          }
          const fallback = direction.expectedAmount ? null : null;
          const startDate = earliestBuy
            ? earliestBuy
            : direction.createdAt
              ? new Date((direction as any).createdAt)
              : null;
          const now = new Date();
          const years = startDate
            ? Math.max(
                (now.getTime() - startDate.getTime()) /
                  (1000 * 60 * 60 * 24 * 365),
                1 / 12,
              )
            : 1 / 12;
          if (factor <= 0) return "0.00";
          const annualized = (Math.pow(factor, 1 / years) - 1) * 100;
          return annualized.toFixed(2);
        } catch (err) {
          return "0.00";
        }
      })(),
      totalSellProfit: normalizeZero(totalSellProfit), // 累计卖出收益
      totalDividendCash: normalizeZero(totalDividendCash), // 累计现金分红
      totalDividendReinvest: normalizeZero(totalDividendReinvest), // 累计再投资分红
      totalProfit: normalizeZero(totalProfit), // 累计总收益
      totalProfitRate: normalizeZero(totalProfitRate), // 累计收益率(%)
      fundCount: direction.funds.length, // 基金数量
    });
  } catch (error: unknown) {
    console.error("获取投资方向汇总统计失败:", error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      {
        error: "获取投资方向汇总统计失败",
        message,
      },
      { status: 500 },
    );
  }
}
