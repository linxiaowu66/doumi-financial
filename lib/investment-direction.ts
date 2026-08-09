import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 计算并更新投资方向的实际投入金额
 * 实际投入 = 当前持仓成本，不包括已清仓基金
 */
export async function updateInvestmentDirectionActualAmount(
  directionId: number
): Promise<void> {
  try {
    // 获取投资方向及其所有基金的交易记录
    const direction = await prisma.investmentDirection.findUnique({
      where: { id: directionId },
      include: {
        funds: {
          include: {
            transactions: true, // 获取所有交易记录
          },
        },
      },
    });

    if (!direction) {
      console.warn(`投资方向 ${directionId} 不存在`);
      return;
    }

    let totalCost = new Decimal(0);
    const precisionThreshold = new Decimal("0.03");

    for (const fund of direction.funds) {
      let fundShares = new Decimal(0);
      let fundCost = new Decimal(0);

      for (const tx of fund.transactions) {
        const amount = new Decimal(tx.amount.toString());
        const shares = new Decimal(tx.shares.toString());
        
        if (tx.type === 'BUY') {
          fundShares = fundShares.plus(shares);
          fundCost = fundCost.plus(amount);
        } else if (tx.type === 'SELL') {
          const sellShares = shares.abs();
          const averageCost = fundShares.isZero()
            ? new Decimal(0)
            : fundCost.dividedBy(fundShares);
          fundShares = fundShares.minus(sellShares);
          fundCost = fundCost.minus(averageCost.times(sellShares));
        } else if (tx.type === 'DIVIDEND' && tx.dividendReinvest) {
          fundShares = fundShares.plus(shares);
        }
      }

      if (fundShares.abs().lessThan(precisionThreshold)) {
        fundCost = new Decimal(0);
      }
      totalCost = totalCost.plus(fundCost);
    }

    if (totalCost.abs().lessThan(precisionThreshold)) {
      totalCost = new Decimal(0);
    }

    // 更新投资方向的实际投入金额
    await prisma.investmentDirection.update({
      where: { id: directionId },
      data: {
        actualAmount: totalCost,
      },
    });
  } catch (error) {
    console.error(`更新投资方向 ${directionId} 的实际投入失败:`, error);
    throw error;
  }
}

/**
 * 通过基金ID获取投资方向ID，然后更新实际投入
 */
export async function updateActualAmountByFundId(
  fundId: number
): Promise<void> {
  try {
    const fund = await prisma.fund.findUnique({
      where: { id: fundId },
      select: { directionId: true },
    });

    if (!fund || !fund.directionId) {
      console.warn(`基金 ${fundId} 不存在或没有关联的投资方向`);
      return;
    }

    await updateInvestmentDirectionActualAmount(fund.directionId);
  } catch (error) {
    console.error(`通过基金ID ${fundId} 更新实际投入失败:`, error);
    throw error;
  }
}
