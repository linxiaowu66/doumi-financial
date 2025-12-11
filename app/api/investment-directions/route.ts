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
      },
    });

    return NextResponse.json(directions);
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
