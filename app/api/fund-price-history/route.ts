import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { getFundNetWorth } from '@/lib/fund-price';

// GET - 获取基金历史净值（指定日期）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const date = searchParams.get('date'); // YYYY-MM-DD格式

    if (!code) {
      return NextResponse.json({ error: '基金代码不能为空' }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: '日期不能为空' }, { status: 400 });
    }

    const result = await getFundNetWorth(code, date);

    if (result) {
      return NextResponse.json(result);
    }

    const targetDateStr = dayjs(date).format('YYYY-MM-DD');
    return NextResponse.json(
      {
        error: `未找到 ${targetDateStr} 的净值数据（该日期可能是非交易日或超出数据范围）`,
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('获取历史净值失败:', error);
    return NextResponse.json(
      { error: '获取历史净值失败，请稍后重试' },
      { status: 500 }
    );
  }
}
