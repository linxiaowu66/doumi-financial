import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface FundAlertItem {
  fundId: number;
  fundCode: string;
  fundName: string;
  directionId: number;
  directionName: string;
  category: string | null;
  alertType: 'price_drop' | 'price_rise' | 'category_overdue' | 'category_overweight' | 'pending_transaction';
  alertReason: string;
  latestBuyPrice?: number;
  currentPrice?: number;
  priceChangePercent?: number;
  daysSinceLastBuy?: number;
  categoryHoldingCost?: number;
  categoryTargetAmount?: number;
  overweightPercent?: number;
  pendingCount?: number;
}

// GET - 获取所有基金的预警信息
export async function GET() {
  try {
    const alerts: FundAlertItem[] = [];

    // 获取所有投资方向及其基金
    const directions = await prisma.investmentDirection.findMany({
      include: {
        funds: {
          include: {
            transactions: {
              orderBy: { date: 'asc' },
            },
            pendingTransactions: {
              where: { status: 'WAITING' },
            },
          },
        },
        categoryTargets: true,
      },
    });

    const normalizeZero = (value: number): number => {
      return Math.abs(value) < 0.01 ? 0 : value;
    };

    const PRECISION_THRESHOLD = new Decimal('0.01');

    // 遍历每个投资方向
    for (const direction of directions) {
      // 检查每个基金的待确认交易和预警情况
      for (const fund of direction.funds) {
        // 1. 检查待确认交易
        if (fund.pendingTransactions.length > 0) {
          alerts.push({
            fundId: fund.id,
            fundCode: fund.code,
            fundName: fund.name,
            directionId: direction.id,
            directionName: direction.name,
            category: fund.category,
            alertType: 'pending_transaction',
            alertReason: `有 ${fund.pendingTransactions.length} 笔交易等待确认`,
            pendingCount: fund.pendingTransactions.length,
          });
        }
      }

      // 按分类分组基金（用于检查分类预警）
      const fundsByCategory = direction.funds.reduce((acc, fund) => {
        const category = fund.category || 'uncategorized';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(fund);
        return acc;
      }, {} as Record<string, typeof direction.funds>);

      // 检查每个分类的预警
      for (const [category, categoryFunds] of Object.entries(fundsByCategory)) {
        const categoryTarget = direction.categoryTargets.find(
          (t) => t.categoryName === category
        );

        let categoryHoldingCost = 0;
        const categoryFundStats: Array<{
          fund: typeof categoryFunds[0];
          holdingCost: number;
          holdingShares: number;
        }> = [];

        for (const fund of categoryFunds) {
          let totalShares = new Decimal(0);
          let totalCost = new Decimal(0);

          fund.transactions.forEach((tx) => {
            const amount = new Decimal(tx.amount);
            const shares = new Decimal(tx.shares);

            if (tx.type === 'BUY') {
              totalShares = totalShares.plus(shares);
              totalCost = totalCost.plus(amount);
            } else if (tx.type === 'SELL') {
              const sellShares = shares.abs();
              const avgCostAtSell = totalShares.greaterThan(0)
                ? totalCost.dividedBy(totalShares)
                : new Decimal(0);
              const costOfSold = avgCostAtSell.times(sellShares);
              totalShares = totalShares.minus(sellShares);
              totalCost = totalCost.minus(costOfSold);
            } else if (tx.type === 'DIVIDEND' && tx.dividendReinvest) {
              totalShares = totalShares.plus(shares);
            }
          });

          if (totalShares.abs().lessThan(PRECISION_THRESHOLD)) {
            totalShares = new Decimal(0);
            totalCost = new Decimal(0);
          }

          const holdingShares = normalizeZero(parseFloat(totalShares.toString()));
          const holdingCost = normalizeZero(parseFloat(totalCost.toString()));

          categoryFundStats.push({ fund, holdingCost, holdingShares });
          categoryHoldingCost += holdingCost;
        }

        // 检查分类仓位超标
        const targetPercentNum = categoryTarget ? Number(categoryTarget.targetPercent) : 0;
        if (categoryTarget && targetPercentNum > 0) {
          const targetAmount = (Number(direction.expectedAmount) * targetPercentNum) / 100;
          const overweightAmount = categoryHoldingCost - targetAmount;

          if (overweightAmount > 0) {
            const overweightPercent = (overweightAmount / targetAmount) * 100;
            for (const { fund, holdingShares } of categoryFundStats) {
              if (holdingShares > 0) {
                alerts.push({
                  fundId: fund.id,
                  fundCode: fund.code,
                  fundName: fund.name,
                  directionId: direction.id,
                  directionName: direction.name,
                  category: fund.category,
                  alertType: 'category_overweight',
                  alertReason: `${category} 分类仓位超标 ${overweightPercent.toFixed(1)}%`,
                  categoryHoldingCost,
                  categoryTargetAmount: targetAmount,
                  overweightPercent,
                });
              }
            }
          }
        }

        // 检查分类长期未买入
        let categoryLastBuyDate: Date | null = null;
        for (const { fund, holdingShares } of categoryFundStats) {
          if (holdingShares === 0) continue;
          const buyTransactions = fund.transactions.filter((tx) => tx.type === 'BUY');
          if (buyTransactions.length > 0) {
            const lastBuyDate = buyTransactions[buyTransactions.length - 1].date;
            if (!categoryLastBuyDate || lastBuyDate > categoryLastBuyDate) {
              categoryLastBuyDate = lastBuyDate;
            }
          }
        }

        if (categoryLastBuyDate) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const lastBuyDateNormalized = new Date(categoryLastBuyDate);
          lastBuyDateNormalized.setHours(0, 0, 0, 0);
          const daysDiff = Math.floor((today.getTime() - lastBuyDateNormalized.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff > 45) {
            for (const { fund, holdingShares } of categoryFundStats) {
              if (holdingShares > 0) {
                alerts.push({
                  fundId: fund.id,
                  fundCode: fund.code,
                  fundName: fund.name,
                  directionId: direction.id,
                  directionName: direction.name,
                  category: fund.category,
                  alertType: 'category_overdue',
                  alertReason: `${category} 分类已 ${daysDiff} 天未买入`,
                  daysSinceLastBuy: daysDiff,
                });
              }
            }
          }
        }
      }

      // 检查单个基金的价格涨跌预警
      for (const fund of direction.funds) {
        let totalShares = new Decimal(0);
        fund.transactions.forEach((tx) => {
          if (tx.type === 'BUY') totalShares = totalShares.plus(tx.shares);
          else if (tx.type === 'SELL') totalShares = totalShares.minus(new Decimal(tx.shares).abs());
          else if (tx.type === 'DIVIDEND' && tx.dividendReinvest) totalShares = totalShares.plus(tx.shares);
        });

        if (normalizeZero(parseFloat(totalShares.toString())) === 0) continue;

        const buyTransactions = fund.transactions.filter((tx) => tx.type === 'BUY');
        if (buyTransactions.length === 0 || !fund.latestNetWorth) continue;

        const latestBuyPrice = parseFloat(buyTransactions[buyTransactions.length - 1].price.toString());
        const currentPrice = parseFloat(fund.latestNetWorth.toString());
        const priceChangePercent = ((currentPrice - latestBuyPrice) / latestBuyPrice) * 100;

        if (priceChangePercent <= -5) {
          alerts.push({
            fundId: fund.id,
            fundCode: fund.code,
            fundName: fund.name,
            directionId: direction.id,
            directionName: direction.name,
            category: fund.category,
            alertType: 'price_drop',
            alertReason: `相比最新买入价格下跌 ${Math.abs(priceChangePercent).toFixed(1)}%`,
            latestBuyPrice,
            currentPrice,
            priceChangePercent,
          });
        } else if (priceChangePercent >= 8) {
          alerts.push({
            fundId: fund.id,
            fundCode: fund.code,
            fundName: fund.name,
            directionId: direction.id,
            directionName: direction.name,
            category: fund.category,
            alertType: 'price_rise',
            alertReason: `相比最新买入价格上涨 ${priceChangePercent.toFixed(1)}%`,
            latestBuyPrice,
            currentPrice,
            priceChangePercent,
          });
        }
      }
    }

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('获取预警信息失败:', error);
    return NextResponse.json({ error: '获取预警信息失败' }, { status: 500 });
  }
}