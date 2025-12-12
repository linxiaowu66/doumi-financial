import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';

// GET - 获取投资方向的每日盈亏和累计盈亏数据
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30'); // 默认30天

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

    // 计算起始日期
    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');

    // 获取所有交易记录，按日期排序
    const allTransactions: Array<{
      date: Date;
      fundId: number;
      type: string;
      amount: Decimal;
      shares: Decimal;
      price: Decimal;
      fee: Decimal;
      dividendReinvest: boolean;
    }> = [];

    for (const fund of direction.funds) {
      for (const tx of fund.transactions) {
        allTransactions.push({
          date: tx.date,
          fundId: fund.id,
          type: tx.type,
          amount: tx.amount,
          shares: tx.shares,
          price: tx.price,
          fee: tx.fee,
          dividendReinvest: tx.dividendReinvest || false,
        });
      }
    }

    // 按日期排序
    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 获取每日的净值数据（如果有的话）
    // 这里我们需要计算每日的持仓市值
    // 由于我们没有历史净值数据，我们使用当前净值来估算
    // 实际应用中，应该存储每日净值快照

    // 计算每日的累计投入和累计收益
    const dailyData: Array<{
      date: string;
      dailyProfit: number; // 每日盈亏
      cumulativeProfit: number; // 累计盈亏
      cumulativeProfitRate: number; // 累计收益率
      totalInvested: number; // 累计投入
      currentValue: number; // 当前市值
    }> = [];

    let cumulativeInvested = new Decimal(0);
    let cumulativeProfit = new Decimal(0);
    const fundStates = new Map<
      number,
      {
        shares: Decimal;
        cost: Decimal;
        sellProfit: Decimal;
        dividendCash: Decimal;
        dividendReinvest: Decimal;
      }
    >();

    // 初始化基金状态
    for (const fund of direction.funds) {
      fundStates.set(fund.id, {
        shares: new Decimal(0),
        cost: new Decimal(0),
        sellProfit: new Decimal(0),
        dividendCash: new Decimal(0),
        dividendReinvest: new Decimal(0),
      });
    }

    // 按日期处理交易，计算每日数据
    const dateMap = new Map<string, Decimal>();

    for (const tx of allTransactions) {
      const txDate = dayjs(tx.date);
      if (txDate.isBefore(startDate)) {
        // 处理起始日期之前的交易
        const state = fundStates.get(tx.fundId)!;
        const amount = new Decimal(tx.amount.toString());
        const shares = new Decimal(tx.shares.toString());
        const price = new Decimal(tx.price.toString());
        const fee = new Decimal(tx.fee.toString());

        if (tx.type === 'BUY') {
          state.shares = state.shares.plus(shares);
          state.cost = state.cost.plus(amount);
          cumulativeInvested = cumulativeInvested.plus(amount);
        } else if (tx.type === 'SELL') {
          const sellShares = shares.abs();
          const avgCostPrice = state.shares.isZero()
            ? new Decimal(0)
            : state.cost.dividedBy(state.shares);
          const costOfSold = avgCostPrice.times(sellShares);
          const sellRevenue = sellShares.times(price).minus(fee);
          const sellProfit = sellRevenue.minus(costOfSold);

          state.shares = state.shares.minus(sellShares);
          state.cost = state.cost.minus(costOfSold);
          state.sellProfit = state.sellProfit.plus(sellProfit);
          cumulativeProfit = cumulativeProfit.plus(sellProfit);
        } else if (tx.type === 'DIVIDEND') {
          if (tx.dividendReinvest) {
            state.shares = state.shares.plus(shares);
            state.dividendReinvest = state.dividendReinvest.plus(amount);
            cumulativeProfit = cumulativeProfit.plus(amount);
          } else {
            state.dividendCash = state.dividendCash.plus(amount);
            cumulativeProfit = cumulativeProfit.plus(amount);
          }
        }
      } else {
        // 处理起始日期之后的交易
        const dateKey = txDate.format('YYYY-MM-DD');
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Decimal(0));
        }
      }
    }

    // 计算每日数据
    let previousCumulativeProfit = cumulativeProfit;
    let previousInvested = cumulativeInvested;

    // 获取所有需要计算的日期
    const dates: string[] = [];
    let currentDate = startDate;
    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, 'day')
    ) {
      dates.push(currentDate.format('YYYY-MM-DD'));
      currentDate = currentDate.add(1, 'day');
    }

    for (const dateStr of dates) {
      const date = dayjs(dateStr);
      let dailyProfit = new Decimal(0);
      let currentInvested = previousInvested;
      let currentValue = new Decimal(0);

      // 处理当天的交易
      for (const tx of allTransactions) {
        if (dayjs(tx.date).format('YYYY-MM-DD') === dateStr) {
          const state = fundStates.get(tx.fundId)!;
          const amount = new Decimal(tx.amount.toString());
          const shares = new Decimal(tx.shares.toString());
          const price = new Decimal(tx.price.toString());
          const fee = new Decimal(tx.fee.toString());

          if (tx.type === 'BUY') {
            state.shares = state.shares.plus(shares);
            state.cost = state.cost.plus(amount);
            currentInvested = currentInvested.plus(amount);
          } else if (tx.type === 'SELL') {
            const sellShares = shares.abs();
            const avgCostPrice = state.shares.isZero()
              ? new Decimal(0)
              : state.cost.dividedBy(state.shares);
            const costOfSold = avgCostPrice.times(sellShares);
            const sellRevenue = sellShares.times(price).minus(fee);
            const sellProfit = sellRevenue.minus(costOfSold);

            state.shares = state.shares.minus(sellShares);
            state.cost = state.cost.minus(costOfSold);
            state.sellProfit = state.sellProfit.plus(sellProfit);
            dailyProfit = dailyProfit.plus(sellProfit);
          } else if (tx.type === 'DIVIDEND') {
            if (tx.dividendReinvest) {
              state.shares = state.shares.plus(shares);
              state.dividendReinvest = state.dividendReinvest.plus(amount);
              dailyProfit = dailyProfit.plus(amount);
            } else {
              state.dividendCash = state.dividendCash.plus(amount);
              dailyProfit = dailyProfit.plus(amount);
            }
          }
        }
      }

      // 计算当前市值（使用最新净值）
      for (const fund of direction.funds) {
        const state = fundStates.get(fund.id)!;
        if (fund.latestNetWorth && state.shares.greaterThan(0)) {
          const currentPrice = new Decimal(fund.latestNetWorth.toString());
          const fundValue = state.shares.times(currentPrice);
          currentValue = currentValue.plus(fundValue);
        }
      }

      // 计算持仓盈亏（市值 - 成本）
      const holdingProfit = currentValue.minus(
        Array.from(fundStates.values()).reduce(
          (sum, state) => sum.plus(state.cost),
          new Decimal(0)
        )
      );

      // 累计卖出收益和分红
      const totalSellProfit = Array.from(fundStates.values()).reduce(
        (sum, state) => sum.plus(state.sellProfit),
        new Decimal(0)
      );
      const totalDividendCash = Array.from(fundStates.values()).reduce(
        (sum, state) => sum.plus(state.dividendCash),
        new Decimal(0)
      );
      const totalDividendReinvest = Array.from(fundStates.values()).reduce(
        (sum, state) => sum.plus(state.dividendReinvest),
        new Decimal(0)
      );

      // 累计总收益
      const totalProfit = holdingProfit
        .plus(totalSellProfit)
        .plus(totalDividendCash)
        .plus(totalDividendReinvest);

      // 计算每日盈亏（相对于前一天的变化）
      const currentCumulativeProfit = totalProfit;
      const dayProfit = currentCumulativeProfit.minus(previousCumulativeProfit);

      // 累计收益率
      const profitRate = currentInvested.isZero()
        ? 0
        : totalProfit.dividedBy(currentInvested).times(100).toNumber();

      dailyData.push({
        date: dateStr,
        dailyProfit: parseFloat(dayProfit.toFixed(2)),
        cumulativeProfit: parseFloat(currentCumulativeProfit.toFixed(2)),
        cumulativeProfitRate: profitRate,
        totalInvested: parseFloat(currentInvested.toFixed(2)),
        currentValue: parseFloat(currentValue.toFixed(2)),
      });

      previousCumulativeProfit = currentCumulativeProfit;
      previousInvested = currentInvested;
    }

    return NextResponse.json({
      directionId,
      directionName: direction.name,
      days,
      data: dailyData,
    });
  } catch (error: unknown) {
    console.error('获取盈亏图表数据失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '获取盈亏图表数据失败',
        message,
      },
      { status: 500 }
    );
  }
}
