import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - 获取基金列表（可按投资方向筛选）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const directionId = searchParams.get('directionId');

    const where = directionId ? { directionId: parseInt(directionId) } : {};

    const funds = await prisma.fund.findMany({
      where,
      include: {
        direction: true,
        transactions: {
          orderBy: { date: 'desc' },
        },
        plannedPurchases: {
          where: { status: 'PENDING' },
        },
        pendingTransactions: {
          where: { status: 'WAITING' },
          select: { id: true },
        },
        _count: {
          select: {
            transactions: true,
            plannedPurchases: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 处理数据，将待确认交易数量注入到 _count 中
    const fundsWithCount = funds.map((fund) => {
      const pendingCount = fund.pendingTransactions.length;
      // 移除 pendingTransactions 数组，避免返回冗余数据（如果前端不需要详情）
      const { pendingTransactions, ...rest } = fund;
      
      return {
        ...rest,
        _count: {
          ...fund._count,
          pendingTransactions: pendingCount,
        },
      };
    });

    return NextResponse.json(fundsWithCount);
  } catch (error) {
    console.error('获取基金列表失败:', error);
    return NextResponse.json({ error: '获取基金列表失败' }, { status: 500 });
  }
}

// POST - 创建新基金
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      directionId, 
      code, 
      name, 
      category, 
      remark,
      confirmDays = 1,
      defaultBuyFee = 0.15,
      defaultSellFee = 0.50
    } = body;

    if (!directionId || !code || !name) {
      return NextResponse.json(
        { error: '投资方向、基金代码和名称不能为空' },
        { status: 400 }
      );
    }

    const fund = await prisma.fund.create({
      data: {
        directionId: parseInt(directionId),
        code,
        name,
        category,
        remark,
        confirmDays: parseInt(confirmDays),
        defaultBuyFee,
        defaultSellFee,
      },
      include: {
        direction: true,
      },
    });

    return NextResponse.json(fund);
  } catch (error) {
    console.error('创建基金失败:', error);
    return NextResponse.json({ error: '创建基金失败' }, { status: 500 });
  }
}
