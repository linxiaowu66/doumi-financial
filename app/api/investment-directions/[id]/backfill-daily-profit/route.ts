import { NextResponse } from 'next/server';
import { saveDirectionDailyProfitRange } from '@/lib/direction-daily-profit';

// POST - 为指定投资方向回填历史每日盈亏数据
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30'); // 默认30天

    const directionId = parseInt(id);

    const result = await saveDirectionDailyProfitRange(directionId, days);

    return NextResponse.json({
      success: true,
      message: `回填完成：成功 ${result.success} 天，失败 ${result.failed} 天`,
      directionId,
      days,
      ...result,
    });
  } catch (error: unknown) {
    console.error('回填每日盈亏数据失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '回填每日盈亏数据失败',
        message,
      },
      { status: 500 }
    );
  }
}

// GET - 获取回填状态
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json({
    message: '请使用 POST 方法调用此API',
    usage: 'POST /api/investment-directions/[id]/backfill-daily-profit?days=30',
    description: '为指定投资方向回填最近N天的每日盈亏数据（使用历史净值）',
  });
}
