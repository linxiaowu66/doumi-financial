import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { GeminiService } from '@/lib/ai';
import { Decimal } from '@prisma/client/runtime/library';
import dayjs from 'dayjs';

// GET - AI分析投资方向
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
        categoryTargets: true,
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
    let totalInvested = new Decimal(0);
    let totalCurrentValue = new Decimal(0);
    let totalCost = new Decimal(0);
    let totalSellProfit = new Decimal(0);
    let totalDividendCash = new Decimal(0);
    let totalDividendReinvest = new Decimal(0);

    const firstDayOfMonth = dayjs().startOf('month').toDate();

    const fundsAnalysis = [];
    const recentTransactions = [];

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

        if (dayjs(tx.date).isAfter(firstDayOfMonth)) {
          recentTransactions.push({
            fundName: fund.name,
            type: tx.type,
            date: dayjs(tx.date).format('YYYY-MM-DD'),
            amount: parseFloat(amount.toString()),
            price: parseFloat(price.toString()),
          });
        }

        if (tx.type === 'BUY') {
          fundShares = fundShares.plus(shares);
          fundCost = fundCost.plus(amount);
          totalInvested = totalInvested.plus(amount);
        } else if (tx.type === 'SELL') {
          const sellShares = shares.abs();
          const avgCostPrice = fundShares.isZero() ? new Decimal(0) : fundCost.dividedBy(fundShares);
          const costOfSold = avgCostPrice.times(sellShares);

          fundShares = fundShares.minus(sellShares);
          fundCost = fundCost.minus(costOfSold);

          const sellRevenue = sellShares.times(price).minus(fee);
          const sellProfit = sellRevenue.minus(costOfSold);
          fundSellProfit = fundSellProfit.plus(sellProfit);
        } else if (tx.type === 'DIVIDEND') {
          if (tx.dividendReinvest) {
            fundShares = fundShares.plus(shares);
            fundDividendReinvest = fundDividendReinvest.plus(amount);
          } else {
            fundDividendCash = fundDividendCash.plus(amount);
          }
        }
      }

      if (fundShares.abs().lessThan(new Decimal("0.03"))) {
        fundShares = new Decimal(0);
        fundCost = new Decimal(0);
      }

      totalCost = totalCost.plus(fundCost);
      totalSellProfit = totalSellProfit.plus(fundSellProfit);
      totalDividendCash = totalDividendCash.plus(fundDividendCash);
      totalDividendReinvest = totalDividendReinvest.plus(fundDividendReinvest);

      let fundCurrentValue = new Decimal(0);
      if (fund.latestNetWorth && fundShares.greaterThan(0)) {
        const currentPrice = new Decimal(fund.latestNetWorth.toString());
        fundCurrentValue = fundShares.times(currentPrice);
        totalCurrentValue = totalCurrentValue.plus(fundCurrentValue);
      }

      const holdingProfit = fundCurrentValue.minus(fundCost);
      
      fundsAnalysis.push({
        name: fund.name,
        code: fund.code,
        category: fund.category,
        holdingShares: parseFloat(fundShares.toString()),
        holdingCost: parseFloat(fundCost.toString()),
        holdingValue: parseFloat(fundCurrentValue.toString()),
        holdingProfit: parseFloat(holdingProfit.toString()),
        holdingProfitRate: fundCost.greaterThan(0) ? parseFloat(holdingProfit.dividedBy(fundCost).times(100).toString()).toFixed(2) + '%' : '0%',
        latestNetWorth: fund.latestNetWorth,
        netWorthDate: fund.netWorthDate,
      });
    }

    if (totalCost.abs().lessThan(new Decimal("0.03"))) {
      totalCost = new Decimal(0);
    }
    if (totalCurrentValue.abs().lessThan(new Decimal("0.03"))) {
      totalCurrentValue = new Decimal(0);
    }

    const holdingProfit = totalCurrentValue.minus(totalCost);
    const totalProfit = holdingProfit.plus(totalSellProfit).plus(totalDividendCash).plus(totalDividendReinvest);
    const totalProfitRate = totalInvested.isZero() ? new Decimal(0) : totalProfit.dividedBy(totalInvested).times(100);

    // 获取本月盈亏
    const firstDayOfYear = dayjs().startOf('year').toDate();
    const yearRecords = await prisma.directionDailyProfit.findMany({
      where: {
        directionId,
        date: { gte: firstDayOfYear }
      }
    });

    let monthProfit = new Decimal(0);
    let yearProfit = new Decimal(0);

    yearRecords.forEach(record => {
      const profit = new Decimal(record.dailyProfit.toString());
      yearProfit = yearProfit.plus(profit);
      if (dayjs(record.date).isAfter(dayjs(firstDayOfMonth).subtract(1, 'second'))) {
        monthProfit = monthProfit.plus(profit);
      }
    });

    const accountData = {
      directionName: direction.name,
      expectedAmount: parseFloat(direction.expectedAmount.toString()),
      actualAmount: parseFloat(direction.actualAmount.toString()),
      summary: {
        totalInvested: parseFloat(totalInvested.toString()),
        totalCurrentValue: parseFloat(totalCurrentValue.toString()),
        totalCost: parseFloat(totalCost.toString()),
        holdingProfit: parseFloat(holdingProfit.toString()),
        totalProfit: parseFloat(totalProfit.toString()),
        totalProfitRate: parseFloat(totalProfitRate.toString()).toFixed(2) + '%',
        monthProfit: parseFloat(monthProfit.toString()),
        yearProfit: parseFloat(yearProfit.toString()),
      },
      categoryTargets: direction.categoryTargets.map(t => ({
        category: t.categoryName,
        targetPercent: t.targetPercent,
      })),
      funds: fundsAnalysis.filter(f => f.holdingShares > 0), // 过滤掉已清仓的基金
      recentTransactions: recentTransactions,
    };

    const analysisResult = await GeminiService.analyzeInvestmentDirection(accountData);

    // 记录到数据库
    await prisma.investmentDirectionAnalysis.create({
      data: {
        directionId,
        content: analysisResult,
      }
    });

    return NextResponse.json({ analysis: analysisResult });
  } catch (error: unknown) {
    console.error('获取AI分析失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '获取AI分析失败', message },
      { status: 500 }
    );
  }
}
