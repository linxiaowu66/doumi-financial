import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取待确认交易列表
export async function GET(request: Request) {
  try {
    const pendingTransactions = await prisma.pendingTransaction.findMany({
      where: {
        status: 'WAITING',
      },
      include: {
        fund: {
          include: {
            direction: true,
          },
        },
      },
      orderBy: {
        applyDate: 'desc',
      },
    });

    return NextResponse.json(pendingTransactions);
  } catch (error) {
    console.error('获取待确认交易失败:', error);
    return NextResponse.json({ error: '获取待确认交易失败' }, { status: 500 });
  }
}

// POST - 创建待确认交易
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fundId, type, applyDate, applyAmount, applyShares } = body;

    if (!fundId || !type || !applyDate) {
      return NextResponse.json(
        { error: '基金、交易类型和申请日期不能为空' },
        { status: 400 }
      );
    }

    if (type === 'BUY' && !applyAmount) {
      return NextResponse.json(
        { error: '买入必须提供申请金额' },
        { status: 400 }
      );
    }

    if (type === 'SELL' && !applyShares) {
      return NextResponse.json(
        { error: '卖出必须提供申请份额' },
        { status: 400 }
      );
    }

    const pendingTransaction = await prisma.pendingTransaction.create({
      data: {
        fundId: parseInt(fundId),
        type,
        applyDate: new Date(applyDate),
        applyAmount: applyAmount ? parseFloat(applyAmount) : null,
        applyShares: applyShares ? parseFloat(applyShares) : null,
        status: 'WAITING',
      },
      include: {
        fund: true,
      },
    });

    return NextResponse.json(pendingTransaction);
  } catch (error) {
    console.error('创建待确认交易失败:', error);
    return NextResponse.json({ error: '创建待确认交易失败' }, { status: 500 });
  }
}
