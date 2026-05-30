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

    const parsedNetWorth = parseFloat(netWorth);
    const dateStr = netWorthDate || null;

    const [fund] = await prisma.$transaction([
      prisma.fund.update({
        where: { id: parseInt(id) },
        data: {
          latestNetWorth: parsedNetWorth,
          netWorthDate: dateStr,
          netWorthUpdateAt: new Date(),
        },
      }),
      ...(dateStr
        ? [
            prisma.fundNetWorthHistory.upsert({
              where: { fundId_date: { fundId: parseInt(id), date: dateStr } },
              create: { fundId: parseInt(id), date: dateStr, netWorth: parsedNetWorth },
              update: { netWorth: parsedNetWorth },
            }),
          ]
        : []),
    ]);

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
