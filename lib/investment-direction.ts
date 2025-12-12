import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 计算并更新投资方向的实际投入金额
 * 实际投入 = 该投资方向下所有基金的买入交易金额总和
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
            transactions: {
              where: {
                type: 'BUY', // 只计算买入交易
              },
            },
          },
        },
      },
    });

    if (!direction) {
      console.warn(`投资方向 ${directionId} 不存在`);
      return;
    }

    // 计算所有买入交易的总金额
    let totalInvested = new Decimal(0);

    for (const fund of direction.funds) {
      for (const tx of fund.transactions) {
        if (tx.type === 'BUY') {
          totalInvested = totalInvested.plus(new Decimal(tx.amount.toString()));
        }
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
