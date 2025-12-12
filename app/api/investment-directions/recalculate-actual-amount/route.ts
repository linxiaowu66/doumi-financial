import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { updateInvestmentDirectionActualAmount } from '@/lib/investment-direction';

// POST - 重新计算所有投资方向的实际投入金额
export async function POST() {
  try {
    // 获取所有投资方向
    const directions = await prisma.investmentDirection.findMany({
      select: { id: true },
    });

    // 逐个更新
    const results = [];
    for (const direction of directions) {
      try {
        await updateInvestmentDirectionActualAmount(direction.id);
        results.push({
          directionId: direction.id,
          success: true,
        });
      } catch (error) {
        results.push({
          directionId: direction.id,
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `重新计算完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      results,
    });
  } catch (error) {
    console.error('重新计算实际投入失败:', error);
    return NextResponse.json(
      { error: '重新计算实际投入失败' },
      { status: 500 }
    );
  }
}
