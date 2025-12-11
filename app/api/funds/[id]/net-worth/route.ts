import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PUT - 更新基金净值
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { netWorth, netWorthDate } = body;

    if (!netWorth) {
      return NextResponse.json({ error: '净值不能为空' }, { status: 400 });
    }

    const fund = await prisma.fund.update({
      where: { id: parseInt(id) },
      data: {
        latestNetWorth: parseFloat(netWorth),
        netWorthDate: netWorthDate || null,
        netWorthUpdateAt: new Date(),
      },
    });

    return NextResponse.json(fund);
  } catch (error: unknown) {
    console.error('更新基金净值失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '更新基金净值失败', message },
      { status: 500 }
    );
  }
}
