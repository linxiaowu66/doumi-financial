import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth-scope';

// PUT - 更新基金净值
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return NextResponse.json({ error: '未登录' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const { netWorth, netWorthDate } = body;

    if (!netWorth) {
      return NextResponse.json({ error: '净值不能为空' }, { status: 400 });
    }

    const parsedNetWorth = parseFloat(netWorth);
    const dateStr = netWorthDate || null;
    const owner = await prisma.fund.findFirst({ where: { id: parseInt(id), direction: { userId } }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: '基金不存在' }, { status: 404 });

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
