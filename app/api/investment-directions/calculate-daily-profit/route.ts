import { NextResponse } from 'next/server';
import { saveAllDirectionsDailyProfit } from '@/lib/direction-daily-profit';
import dayjs from 'dayjs';

// POST - 手动触发计算所有投资方向的每日盈亏
// 可以指定日期，如果不指定则使用今天
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { date } = body;

    const targetDate = date ? dayjs(date).toDate() : new Date();

    const result = await saveAllDirectionsDailyProfit(targetDate);

    return NextResponse.json({
      success: true,
      message: `计算完成：成功 ${result.success} 个，失败 ${result.failed} 个`,
      date: dayjs(targetDate).format('YYYY-MM-DD'),
      ...result,
    });
  } catch (error: unknown) {
    console.error('计算每日盈亏失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '计算每日盈亏失败',
        message,
      },
      { status: 500 }
    );
  }
}

// GET - 获取计算状态
export async function GET() {
  return NextResponse.json({
    message: '请使用 POST 方法调用此API',
    usage: 'POST /api/investment-directions/calculate-daily-profit',
    body: {
      date: '可选，格式：YYYY-MM-DD，不指定则使用今天',
    },
  });
}
