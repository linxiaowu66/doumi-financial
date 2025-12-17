import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';

// GET - 获取Dashboard汇总统计（所有投资方向）
export async function GET() {
  try {
    // 获取所有投资方向
    const directions = await prisma.investmentDirection.findMany({
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

    // 初始化总计数据
    let totalProfit = new Decimal(0); // 累计总收益
    let totalCurrentValue = new Decimal(0); // 当前总市值
    let totalCost = new Decimal(0); // 持仓总成本
    let totalInvested = new Decimal(0); // 历史总投入（用于计算累计收益率）

    // 遍历每个投资方向，计算其累计收益
    for (const direction of directions) {
      // 初始化该投资方向的统计
      let directionProfit = new Decimal(0);
      let directionCurrentValue = new Decimal(0);
      let directionCost = new Decimal(0);

      // 遍历该投资方向下的每只基金
      for (const fund of direction.funds) {
        let fundShares = new Decimal(0); // 当前持仓份额
        let fundCost = new Decimal(0); // 持仓成本
        let fundSellProfit = new Decimal(0); // 卖出收益
        let fundDividendCash = new Decimal(0); // 现金分红
        let fundDividendReinvest = new Decimal(0); // 分红再投资

        // 遍历该基金的所有交易
        for (const tx of fund.transactions) {
          const amount = new Decimal(tx.amount.toString());
          const shares = new Decimal(tx.shares.toString());
          const price = new Decimal(tx.price.toString());
          const fee = new Decimal(tx.fee.toString());

          if (tx.type === 'BUY') {
            // 买入：增加份额和成本，并累加到总投入
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

        // 计算该基金的当前市值
        let fundCurrentValue = new Decimal(0);
        if (!fundShares.isZero() && fund.latestNetWorth) {
          const currentPrice = new Decimal(fund.latestNetWorth.toString());
          fundCurrentValue = fundShares.times(currentPrice);
        }

        // 计算该基金的持仓收益
        const fundHoldingProfit = fundCurrentValue.minus(fundCost);

        // 累计该基金的总收益
        const fundTotalProfit = fundHoldingProfit
          .plus(fundSellProfit)
          .plus(fundDividendCash)
          .plus(fundDividendReinvest);

        directionProfit = directionProfit.plus(fundTotalProfit);
        directionCurrentValue = directionCurrentValue.plus(fundCurrentValue);
        directionCost = directionCost.plus(fundCost);
      }

      totalProfit = totalProfit.plus(directionProfit);
      totalCurrentValue = totalCurrentValue.plus(directionCurrentValue);
      totalCost = totalCost.plus(directionCost);
    }

    // 获取昨日盈亏（从DirectionDailyProfit表查询最近一个交易日的数据）
    // 获取最近的记录
    const latestRecords = await prisma.directionDailyProfit.findMany({
      orderBy: {
        date: 'desc',
      },
      take: 100, // 获取最近的记录（假设有多个投资方向）
    });

    // 按日期分组
    const groupedByDate = latestRecords.reduce((acc, record) => {
      const dateStr = dayjs(record.date).format('YYYY-MM-DD');
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(record);
      return acc;
    }, {} as Record<string, typeof latestRecords>);

    // 找到最近的日期（通常是昨天或最近的交易日）
    const dates = Object.keys(groupedByDate).sort().reverse();
    let todayProfit = new Decimal(0);
    let lastTradeDate = '';
    
    if (dates.length > 0) {
      lastTradeDate = dates[0];
      const latestDayRecords = groupedByDate[lastTradeDate];
      todayProfit = latestDayRecords.reduce(
        (sum, record) => sum.plus(new Decimal(record.dailyProfit.toString())),
        new Decimal(0)
      );
    }

    // 计算盈亏率
    // 累计盈亏率 = 累计盈亏 / 历史总投入 × 100%
    const totalProfitRate = totalInvested.isZero()
      ? new Decimal(0)
      : totalProfit.dividedBy(totalInvested).times(100);

    // 今日盈亏率 = 今日盈亏 / 昨日总资产 × 100%
    // 昨日总资产 = 当前总市值 - 今日盈亏
    const yesterdayTotalValue = totalCurrentValue.minus(todayProfit);
    const todayProfitRate = yesterdayTotalValue.isZero()
      ? new Decimal(0)
      : todayProfit.dividedBy(yesterdayTotalValue).times(100);

    return NextResponse.json({
      totalProfit: totalProfit.toFixed(2), // 累计盈亏
      totalProfitRate: totalProfitRate.toFixed(2), // 累计盈亏率(%)
      todayProfit: todayProfit.toFixed(2), // 最近交易日盈亏
      todayProfitRate: todayProfitRate.toFixed(2), // 最近交易日盈亏率(%)
      lastTradeDate: lastTradeDate || '', // 最近交易日日期
      totalCurrentValue: totalCurrentValue.toFixed(2), // 当前总市值
      totalCost: totalCost.toFixed(2), // 持仓总成本
      totalInvested: totalInvested.toFixed(2), // 历史总投入
      directionCount: directions.length, // 投资方向数量
    });
  } catch (error: unknown) {
    console.error('获取Dashboard汇总统计失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '获取Dashboard汇总统计失败',
        message,
      },
      { status: 500 }
    );
  }
}

