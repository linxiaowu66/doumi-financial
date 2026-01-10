import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取所有投资方向
export async function GET() {
  try {
    const directions = await prisma.investmentDirection.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: { funds: true },
        },
        funds: {
          include: {
            transactions: {
              orderBy: { date: 'desc' },
              take: 1, // 只取每个基金最新的一笔交易
            },
          },
        },
      },
    });

    // 为每个投资方向计算最新一笔交易信息
    const directionsWithLatestTransaction = directions.map((direction) => {
      // 找到所有基金的最新交易，然后取最新的一笔
      const allLatestTransactions = direction.funds
        .flatMap((fund) =>
          fund.transactions.map((tx) => ({
            date: tx.date,
            type: tx.type,
            fundName: fund.name,
          }))
        )
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const latestTransaction =
        allLatestTransactions.length > 0 ? allLatestTransactions[0] : null;

      // 移除 funds 数据，只保留需要的统计信息
      const { funds, ...directionWithoutFunds } = direction;

      return {
        ...directionWithoutFunds,
        latestTransaction: latestTransaction
          ? {
              date: latestTransaction.date,
              type: latestTransaction.type,
              fundName: latestTransaction.fundName,
            }
          : null,
      };
    });

    return NextResponse.json(directionsWithLatestTransaction);
  } catch (error) {
    console.error('获取投资方向失败:', error);
    return NextResponse.json({ error: '获取投资方向失败' }, { status: 500 });
  }
}

// POST - 创建新的投资方向
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, expectedAmount } = body;

    if (!name || !expectedAmount) {
      return NextResponse.json(
        { error: '名称和预期金额不能为空' },
        { status: 400 }
      );
    }

    const direction = await prisma.investmentDirection.create({
      data: {
        name,
        expectedAmount: parseFloat(expectedAmount),
      },
    });

    return NextResponse.json(direction);
  } catch (error) {
    console.error('创建投资方向失败:', error);
    return NextResponse.json({ error: '创建投资方向失败' }, { status: 500 });
  }
}
