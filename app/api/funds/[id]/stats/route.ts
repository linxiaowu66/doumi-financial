import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET - 获取基金统计信息
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const currentPrice = searchParams.get('currentPrice'); // 当前净值（可选）

    const fund = await prisma.fund.findUnique({
      where: { id: parseInt(id) },
      include: {
        transactions: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!fund) {
      return NextResponse.json({ error: '基金不存在' }, { status: 404 });
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

      if (tx.type === 'BUY') {
        // 买入：增加份额和成本
        totalShares = totalShares.plus(shares);
        totalCost = totalCost.plus(amount);
      } else if (tx.type === 'SELL') {
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
      } else if (tx.type === 'DIVIDEND') {
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

    const holdingShares = parseFloat(totalShares.toString());
    const holdingCost = parseFloat(totalCost.toString());
    const avgCostPrice = holdingShares > 0 ? holdingCost / holdingShares : 0;

    // 计算收益率（如果提供了当前净值）
    let holdingValue = 0;
    let holdingProfit = 0;
    let holdingProfitRate = 0;
    let totalProfit = 0;
    let totalProfitRate = 0;

    if (currentPrice) {
      const currentPriceDecimal = new Decimal(currentPrice);
      holdingValue = parseFloat(
        totalShares.times(currentPriceDecimal).toString()
      ); // 持仓市值
      holdingProfit = holdingValue - holdingCost; // 持仓收益 = 市值 - 成本
      holdingProfitRate =
        holdingCost > 0 ? (holdingProfit / holdingCost) * 100 : 0; // 持仓收益率

      // 累计收益 = 持仓收益 + 卖出收益 + 现金分红 + 再投资分红
      totalProfit =
        holdingProfit +
        parseFloat(totalSellProfit.toString()) +
        parseFloat(totalDividendCash.toString()) +
        parseFloat(totalDividendReinvest.toString());

      // 累计收益率 = 累计收益 / 总投入成本
      // 总投入 = 当前持仓成本 + 已卖出的成本
      const totalInvested =
        holdingCost +
        parseFloat(totalSellProfit.toString()) +
        parseFloat(totalDividendReinvest.toString());
      totalProfitRate =
        totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
    }

    return NextResponse.json({
      fundId: fund.id,
      holdingShares, // 持仓份额
      holdingCost, // 持仓成本
      avgCostPrice, // 持仓成本价
      holdingValue, // 持仓市值（需要当前净值）
      holdingProfit, // 持仓收益
      holdingProfitRate, // 持仓收益率 (%)
      totalDividendCash: parseFloat(totalDividendCash.toString()), // 现金分红
      totalDividendReinvest: parseFloat(totalDividendReinvest.toString()), // 再投资分红
      totalSellProfit: parseFloat(totalSellProfit.toString()), // 卖出收益
      totalProfit, // 累计收益
      totalProfitRate, // 累计收益率 (%)
      transactionCount: fund.transactions.length,
    });
  } catch (error) {
    console.error('获取基金统计失败:', error);
    return NextResponse.json({ error: '获取基金统计失败' }, { status: 500 });
  }
}
