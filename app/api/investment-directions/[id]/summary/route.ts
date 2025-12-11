import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET - 获取投资方向汇总统计
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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
              orderBy: { date: 'asc' },
            },
          },
        },
      },
    });

    if (!direction) {
      return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });
    }

    // 初始化统计数据
    let totalInvested = new Decimal(0); // 总投入
    let totalCurrentValue = new Decimal(0); // 当前总市值
    let totalCost = new Decimal(0); // 持仓总成本
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

        if (tx.type === 'BUY') {
          // 买入：增加份额和成本
          fundShares = fundShares.plus(shares);
          fundCost = fundCost.plus(amount);
          totalInvested = totalInvested.plus(amount);
        } else if (tx.type === 'SELL') {
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
        } else if (tx.type === 'DIVIDEND') {
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

      // 累加到总统计
      totalCost = totalCost.plus(fundCost);
      totalSellProfit = totalSellProfit.plus(fundSellProfit);
      totalDividendCash = totalDividendCash.plus(fundDividendCash);
      totalDividendReinvest = totalDividendReinvest.plus(fundDividendReinvest);

      // 计算当前市值（使用最新净值）
      if (fund.latestNetWorth) {
        const currentPrice = new Decimal(fund.latestNetWorth.toString());
        const fundValue = fundShares.times(currentPrice);
        totalCurrentValue = totalCurrentValue.plus(fundValue);
      }
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

    // 返回统计结果
    return NextResponse.json({
      directionId,
      directionName: direction.name,
      expectedAmount: direction.expectedAmount.toString(),
      actualAmount: direction.actualAmount.toString(),
      totalInvested: totalInvested.toFixed(2), // 实际总投入
      totalCurrentValue: totalCurrentValue.toFixed(2), // 当前总市值
      totalCost: totalCost.toFixed(2), // 持仓总成本
      holdingProfit: holdingProfit.toFixed(2), // 持仓收益
      totalSellProfit: totalSellProfit.toFixed(2), // 累计卖出收益
      totalDividendCash: totalDividendCash.toFixed(2), // 累计现金分红
      totalDividendReinvest: totalDividendReinvest.toFixed(2), // 累计再投资分红
      totalProfit: totalProfit.toFixed(2), // 累计总收益
      totalProfitRate: totalProfitRate.toFixed(2), // 累计收益率(%)
      fundCount: direction.funds.length, // 基金数量
    });
  } catch (error: any) {
    console.error('获取投资方向汇总统计失败:', error);
    return NextResponse.json(
      {
        error: '获取投资方向汇总统计失败',
        message: error.message || '未知错误',
      },
      { status: 500 }
    );
  }
}
