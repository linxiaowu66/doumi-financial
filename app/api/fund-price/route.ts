import { NextResponse } from 'next/server';

// GET - 获取基金实时净值（使用天天基金网接口）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '基金代码不能为空' }, { status: 400 });
    }

    // 使用天天基金网的JSONP接口
    const url = `http://fundgz.1234567.com.cn/js/${code}.js`;
    const response = await fetch(url);
    const text = await response.text();

    // 解析JSONP响应：jsonpgz({"fundcode":"513500",...});
    const jsonMatch = text.match(/jsonpgz\((.*)\)/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: '获取基金净值失败，请检查基金代码是否正确' },
        { status: 404 }
      );
    }

    const fundData = JSON.parse(jsonMatch[1]);

    return NextResponse.json({
      code: fundData.fundcode,
      name: fundData.name || '',
      netWorth: fundData.dwjz || fundData.gsz, // 单位净值 or 估算净值
      netWorthDate: fundData.jzrq || '', // 净值日期
      dayGrowth: fundData.gszzl || '', // 估算涨跌幅
      expectWorth: fundData.gsz || '', // 估算净值
      expectGrowth: fundData.gszzl || '', // 估算涨幅
      updateTime: fundData.gztime || '', // 更新时间
    });
  } catch (error: any) {
    console.error('获取基金净值失败:', error);
    return NextResponse.json(
      {
        error: '获取基金净值失败',
        message: error.message || '未知错误',
      },
      { status: 500 }
    );
  }
}
