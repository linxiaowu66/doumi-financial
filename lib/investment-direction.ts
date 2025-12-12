import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 计算并更新投资方向的实际投入金额
 * 实际投入 = 买入金额 - 卖出金额 + 分红再投资金额
 * - 买入：增加投入
 * - 卖出：减少投入（资金收回）
 * - 分红再投资：增加投入（收益再投入）
 * - 现金分红：不影响投入（只是收益提取）
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

    // 计算实际投入金额
    // 实际投入 = 买入金额 - 卖出金额 + 分红再投资金额
    let totalInvested = new Decimal(0);

    for (const fund of direction.funds) {
      for (const tx of fund.transactions) {
        const amount = new Decimal(tx.amount.toString());
        
        if (tx.type === 'BUY') {
          // 买入：增加投入
          totalInvested = totalInvested.plus(amount);
        } else if (tx.type === 'SELL') {
          // 卖出：减少投入（资金收回）
          // 卖出金额 = 份额 * 净值 - 手续费，这里amount已经是扣除手续费后的金额
          totalInvested = totalInvested.minus(amount);
        } else if (tx.type === 'DIVIDEND' && tx.dividendReinvest) {
          // 分红再投资：增加投入（收益再投入）
          totalInvested = totalInvested.plus(amount);
        }
        // 现金分红不影响实际投入
      }
    }

    // 更新投资方向的实际投入金额
    await prisma.investmentDirection.update({
      where: { id: directionId },
      data: {
        actualAmount: totalInvested,
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
