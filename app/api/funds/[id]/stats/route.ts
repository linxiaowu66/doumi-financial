import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// GET - 获取基金统计信息
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const currentPrice = searchParams.get("currentPrice"); // 当前净值（可选）

    const fund = await prisma.fund.findUnique({
      where: { id: parseInt(id) },
      include: {
        transactions: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ error: "基金不存在" }, { status: 404 });
    }

    // 计算持仓统计
    let totalShares = new Decimal(0); // 当前持仓份额
    let totalCost = new Decimal(0); // 当前持仓成本
    let totalDividendCash = new Decimal(0); // 现金分红总额
    let totalDividendReinvest = new Decimal(0); // 再投资分红总额
    let totalSellProfit = new Decimal(0); // 卖出收益

    fund.transactions.forEach((tx) => {
      const amount = new Decimal(tx.amount);
      const shares = new Decimal(tx.shares);

      if (tx.type === "BUY") {
        // 买入：增加份额和成本
        totalShares = totalShares.plus(shares);
        totalCost = totalCost.plus(amount);
      } else if (tx.type === "SELL") {
        // 卖出：减少份额，计算卖出收益
        const sellAmount = amount; // 卖出金额（扣除手续费后）
        const sellShares = shares.abs(); // 卖出份额（取绝对值）
        const avgCostAtSell = totalShares.greaterThan(0)
          ? totalCost.dividedBy(totalShares)
          : new Decimal(0);
        const costOfSold = avgCostAtSell.times(sellShares); // 卖出份额对应的成本
        const profit = sellAmount.minus(costOfSold); // 卖出收益 = 卖出金额 - 成本

        totalSellProfit = totalSellProfit.plus(profit);
        totalShares = totalShares.minus(sellShares); // 减少份额
        totalCost = totalCost.minus(costOfSold); // 减少成本
      } else if (tx.type === "DIVIDEND") {
        // 分红
        if (tx.dividendReinvest) {
          // 分红再投资：增加份额，不增加成本（因为是收益）
          totalDividendReinvest = totalDividendReinvest.plus(amount);
          totalShares = totalShares.plus(shares);
        } else {
          // 现金分红：不改变份额
          totalDividendCash = totalDividendCash.plus(amount);
        }
      }
    });

    // 在 Decimal 层面处理精度问题：如果份额接近0，直接设为0（同时成本也设为0）
    // 使用更大的阈值（0.01），因为实际计算中可能产生 -0.0039 这样的值
    const PRECISION_THRESHOLD = new Decimal("0.01");
    if (totalShares.abs().lessThan(PRECISION_THRESHOLD)) {
      totalShares = new Decimal(0);
      totalCost = new Decimal(0);
    }

    // 计算历史总投入（所有买入交易的金额总和 + 分红再投资）
    let totalInvested = new Decimal(0);
    fund.transactions.forEach((tx) => {
      const amount = new Decimal(tx.amount);
      if (tx.type === "BUY") {
        // 买入：累加投入
        totalInvested = totalInvested.plus(amount);
      } else if (tx.type === "DIVIDEND" && tx.dividendReinvest) {
        // 分红再投资：也算投入（收益再投入）
        totalInvested = totalInvested.plus(amount);
      }
    });

    // 转换为 float，并处理负数零问题
    // 使用更大的阈值（0.01），确保接近0的值都被归一化
    const normalizeZero = (value: number): number => {
      return Math.abs(value) < 0.01 ? 0 : value;
    };

    const holdingShares = normalizeZero(parseFloat(totalShares.toString()));
    const holdingCost = normalizeZero(parseFloat(totalCost.toString()));
    const avgCostPrice = holdingShares > 0 ? holdingCost / holdingShares : 0;

    // 计算收益率（如果提供了当前净值）
    let holdingValue = 0;
    let holdingProfit = 0;
    let holdingProfitRate = 0;
    let totalProfit = 0;
    let totalProfitRate = 0;

    if (currentPrice) {
      const currentPriceDecimal = new Decimal(currentPrice);
      holdingValue = normalizeZero(
        parseFloat(totalShares.times(currentPriceDecimal).toString())
      ); // 持仓市值
      holdingProfit = normalizeZero(holdingValue - holdingCost); // 持仓收益 = 市值 - 成本
      holdingProfitRate =
        holdingCost > 0 ? (holdingProfit / holdingCost) * 100 : 0; // 持仓收益率

      // 累计收益 = 持仓收益 + 卖出收益 + 现金分红 + 再投资分红
      totalProfit =
        holdingProfit +
        parseFloat(totalSellProfit.toString()) +
        parseFloat(totalDividendCash.toString()) +
        parseFloat(totalDividendReinvest.toString());

      // 累计收益率 = 累计收益 / 历史总投入
      // 历史总投入 = 所有买入交易的金额总和 + 分红再投资金额
      const totalInvestedFloat = parseFloat(totalInvested.toString());
      totalProfitRate =
        totalInvestedFloat > 0 ? (totalProfit / totalInvestedFloat) * 100 : 0;
    }

    // 确保所有返回值都经过 normalizeZero 处理，避免负数零
    return NextResponse.json({
      fundId: fund.id,
      holdingShares: normalizeZero(holdingShares), // 持仓份额
      holdingCost: normalizeZero(holdingCost), // 持仓成本
      avgCostPrice: normalizeZero(avgCostPrice), // 持仓成本价
      holdingValue: normalizeZero(holdingValue || 0), // 持仓市值（需要当前净值）
      holdingProfit: normalizeZero(holdingProfit || 0), // 持仓收益
      holdingProfitRate: normalizeZero(holdingProfitRate || 0), // 持仓收益率 (%)
      totalDividendCash: normalizeZero(
        parseFloat(totalDividendCash.toString())
      ), // 现金分红
      totalDividendReinvest: normalizeZero(
        parseFloat(totalDividendReinvest.toString())
      ), // 再投资分红
      totalSellProfit: normalizeZero(parseFloat(totalSellProfit.toString())), // 卖出收益
      totalProfit: normalizeZero(totalProfit || 0), // 累计收益
      totalProfitRate: normalizeZero(totalProfitRate || 0), // 累计收益率 (%)
      transactionCount: fund.transactions.length,
    });
  } catch (error) {
    console.error("获取基金统计失败:", error);
    return NextResponse.json({ error: "获取基金统计失败" }, { status: 500 });
  }
}
