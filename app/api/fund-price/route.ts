import { NextResponse } from 'next/server';

// GET - 获取基金实时净值
// 优先使用东方财富移动端API，失败时回退到天天基金网接口
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ error: '基金代码不能为空' }, { status: 400 });
    }

    // 优先尝试东方财富移动端API（更可靠）
    try {
      const eastmoneyUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=20&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123&Fcodes=${code}`;
      const eastmoneyResponse = await fetch(eastmoneyUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      });
      const eastmoneyData = await eastmoneyResponse.json();

      if (
        eastmoneyData.Success &&
        eastmoneyData.Datas &&
        eastmoneyData.Datas.length > 0
      ) {
        const fund = eastmoneyData.Datas[0];
        if (fund.NAV) {
          return NextResponse.json({
            code: fund.FCODE,
            name: fund.SHORTNAME || '',
            netWorth: fund.NAV, // 单位净值
            netWorthDate: fund.PDATE || '', // 净值日期
            dayGrowth: fund.NAVCHGRT || '', // 涨跌幅
            expectWorth: fund.NEWPRICE || fund.NAV || '', // 场内价格或净值
            expectGrowth: fund.CHANGERATIO || fund.NAVCHGRT || '', // 场内涨跌幅或净值涨跌幅
            updateTime: fund.HQDATE || fund.PDATE || '', // 更新时间
            accNetWorth: fund.ACCNAV || '', // 累计净值
          });
        }
      }
    } catch (eastmoneyError) {
      // 如果东方财富API失败，继续尝试旧接口
      console.log('东方财富API获取失败，尝试备用接口:', eastmoneyError);
    }

    // 备用方案：使用天天基金网的JSONP接口
    const url = `http://fundgz.1234567.com.cn/js/${code}.js`;
    const response = await fetch(url);
    const text = await response.text();

    // 检查响应是否为空
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: '获取基金净值失败：接口返回空数据，请检查基金代码是否正确' },
        { status: 404 }
      );
    }

    // 解析JSONP响应：jsonpgz({"fundcode":"513500",...});
    const jsonMatch = text.match(/jsonpgz\((.*)\)/);
    if (!jsonMatch || !jsonMatch[1] || jsonMatch[1].trim().length === 0) {
      // 检查是否是空响应 jsonpgz();
      if (text.trim() === 'jsonpgz();' || text.trim() === 'jsonpgz()') {
        return NextResponse.json(
          {
            error: `基金代码 ${code} 无法获取净值数据，可能该基金不存在或已停售`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: '获取基金净值失败，请检查基金代码是否正确' },
        { status: 404 }
      );
    }

    let fundData;
    try {
      fundData = JSON.parse(jsonMatch[1]);
    } catch (parseError) {
      console.error('解析基金数据失败:', parseError, '原始响应:', text);
      return NextResponse.json(
        { error: '解析基金净值数据失败，请稍后重试' },
        { status: 500 }
      );
    }

    // 检查数据是否有效
    if (!fundData || (!fundData.dwjz && !fundData.gsz)) {
      return NextResponse.json(
        {
          error: `基金代码 ${code} 无法获取净值数据，可能该基金不存在或已停售`,
        },
        { status: 404 }
      );
    }

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
  } catch (error: unknown) {
    console.error('获取基金净值失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '获取基金净值失败',
        message,
      },
      { status: 500 }
    );
  }
}
