import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import dayjs from 'dayjs';

// GET - 获取投资方向的每日盈亏数据
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30'); // 默认30天

    const directionId = parseInt(id);

    // 验证投资方向是否存在
    const direction = await prisma.investmentDirection.findUnique({
      where: { id: directionId },
      select: { id: true, name: true },
    });

    if (!direction) {
      return NextResponse.json({ error: '投资方向不存在' }, { status: 404 });
    }

    // 计算起始日期
    const endDate = dayjs();
    const startDate = endDate.subtract(days, 'day');

    // 从数据库获取每日盈亏数据
    // 检查模型是否存在
    if (!prisma.directionDailyProfit) {
      console.error('Prisma Client 中找不到 directionDailyProfit 模型');
      return NextResponse.json(
        {
          error: '数据库模型未加载',
          message: '请重启开发服务器以加载新的 Prisma Client',
        },
        { status: 500 }
      );
    }

    const dailyProfits = await prisma.directionDailyProfit.findMany({
      where: {
        directionId,
        date: {
          gte: startDate.startOf('day').toDate(),
          lte: endDate.endOf('day').toDate(),
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // 转换为前端需要的格式
    const data = dailyProfits.map((record) => ({
      date: dayjs(record.date).format('YYYY-MM-DD'),
      dailyProfit: parseFloat(record.dailyProfit.toString()),
      cumulativeProfit: parseFloat(record.cumulativeProfit.toString()),
      cumulativeProfitRate: parseFloat(record.cumulativeProfitRate.toString()),
      totalInvested: parseFloat(record.totalInvested.toString()),
      currentValue: parseFloat(record.currentValue.toString()),
    }));

    return NextResponse.json({
      directionId,
      directionName: direction.name,
      days,
      data,
    });
  } catch (error: unknown) {
    console.error('获取每日盈亏数据失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '获取每日盈亏数据失败',
        message,
      },
      { status: 500 }
    );
  }
}
