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
    // 注意：数据库中的 date 是计算日期（如 12.13 表示这是 12.13 零点计算的数据）
    // 但实际计算的是前一天的盈亏（12.12），所以在展示时需要将日期减1天
    const mappedData = dailyProfits.map((record) => ({
      date: dayjs(record.date).subtract(1, 'day').format('YYYY-MM-DD'),
      dailyProfit: parseFloat(record.dailyProfit.toString()),
      cumulativeProfit: parseFloat(record.cumulativeProfit.toString()),
      cumulativeProfitRate: parseFloat(record.cumulativeProfitRate.toString()),
      totalInvested: parseFloat(record.totalInvested.toString()),
      currentValue: parseFloat(record.currentValue.toString()),
    }));

    // 过滤掉周末等无交易的数据点
    // 条件：每日盈亏为0 且 累计盈亏率和前一天相同（表示没有变化）
    const filteredData = mappedData.filter((item, index) => {
      // 如果每日盈亏不为0，保留
      if (Math.abs(item.dailyProfit) > 0.01) {
        return true;
      }

      // 如果是第一条数据，保留（作为基准）
      if (index === 0) {
        return true;
      }

      // 如果累计盈亏率和前一天不同，保留（说明有变化）
      const previousRate = mappedData[index - 1].cumulativeProfitRate;
      if (Math.abs(item.cumulativeProfitRate - previousRate) > 0.0001) {
        return true;
      }

      // 否则过滤掉（每日盈亏为0且累计盈亏率没变化，说明是周末等无交易日）
      return false;
    });

    return NextResponse.json({
      directionId,
      directionName: direction.name,
      days,
      data: filteredData,
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
