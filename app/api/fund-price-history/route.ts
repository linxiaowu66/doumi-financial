import { NextResponse } from 'next/server';
import dayjs from 'dayjs';

interface HistoryDataItem {
  FSRQ?: string;
  NAVDATE?: string;
  NAV?: string;
  DWJZ?: string;
}

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

    // 计算目标日期距今的天数，动态设置查询范围
    const targetDate = dayjs(date);
    const today = dayjs();
    const daysDiff = today.diff(targetDate, 'day');

    // 根据日期距离动态调整pageSize（增加20天缓冲，考虑节假日等非交易日）
    // 最少30天，最多600天（约2年）
    const pageSize = Math.min(Math.max(daysDiff + 20, 30), 600);

    console.log(
      `查询基金 ${code} 在 ${date} 的净值，距今 ${daysDiff} 天，获取 ${pageSize} 条数据`
    );

    // 东方财富移动端历史净值接口
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList?FCODE=${code}&pageIndex=1&pageSize=${pageSize}&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      cache: 'no-store',
    });

    const data = await res.json();

    if (!data?.Datas || !Array.isArray(data.Datas) || data.Datas.length === 0) {
      console.error(`基金 ${code} 历史净值数据为空:`, data);
      return NextResponse.json(
        { error: '无法获取该基金的历史净值数据' },
        { status: 404 }
      );
    }

    // 查找指定日期的净值
    const targetDateStr = targetDate.format('YYYY-MM-DD');

    // 先尝试精确匹配
    for (const item of data.Datas) {
      const dateRaw = item.FSRQ || item.NAVDATE;
      const navValue = item.NAV || item.DWJZ; // DWJZ 为单位净值

      if (navValue && dateRaw) {
        const itemDateStr = dayjs(dateRaw).format('YYYY-MM-DD');

        if (itemDateStr === targetDateStr) {
          return NextResponse.json({
            code: code,
            date: targetDateStr,
            netWorth: parseFloat(navValue),
            matchType: 'exact',
          });
        }
      }
    }

    // 如果没有精确匹配，查找最近的前一个交易日
    // 按日期排序（从新到旧）
    const sortedData = (data.Datas as HistoryDataItem[])
      .filter((item) => {
        const dateRaw = item.FSRQ || item.NAVDATE;
        const navValue = item.NAV || item.DWJZ;
        return navValue && dateRaw;
      })
      .sort((a, b) => {
        const dateA = a.FSRQ || a.NAVDATE || '';
        const dateB = b.FSRQ || b.NAVDATE || '';
        return dayjs(dateB).valueOf() - dayjs(dateA).valueOf();
      });

    // 查找目标日期或之前最近的交易日
    for (const item of sortedData) {
      const dateRaw = item.FSRQ || item.NAVDATE;
      const itemDate = dayjs(dateRaw);

      // 如果这个日期在目标日期之前或相等（允许7天范围内）
      if (
        itemDate.valueOf() <= targetDate.valueOf() &&
        targetDate.diff(itemDate, 'day') <= 7
      ) {
        const navValue = item.NAV || item.DWJZ;
        return NextResponse.json({
          code: code,
          date: itemDate.format('YYYY-MM-DD'),
          requestedDate: targetDateStr,
          netWorth: parseFloat(navValue || '0'),
          matchType: 'nearest',
          message: `${targetDateStr} 为非交易日，使用最近交易日 ${itemDate.format(
            'YYYY-MM-DD'
          )} 的净值`,
        });
      }
    }

    // 如果还是没找到，返回可用的日期范围供参考
    const availableDates = sortedData.slice(0, 5).map((item) => {
      const dateRaw = item.FSRQ || item.NAVDATE;
      return dayjs(dateRaw).format('YYYY-MM-DD');
    });

    console.error(
      `未找到基金 ${code} 在 ${targetDateStr} 附近的净值数据。可用日期:`,
      availableDates
    );

    return NextResponse.json(
      {
        error: `未找到 ${targetDateStr} 的净值数据（该日期可能是非交易日或超出数据范围）`,
        availableDates,
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
