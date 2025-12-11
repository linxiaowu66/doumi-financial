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

    return NextResponse.json(funds);
  } catch (error) {
    console.error('获取基金列表失败:', error);
    return NextResponse.json({ error: '获取基金列表失败' }, { status: 500 });
  }
}

// POST - 创建新基金
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { directionId, code, name, category, remark } = body;

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
