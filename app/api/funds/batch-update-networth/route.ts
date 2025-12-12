import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 延迟函数，用于避免限流
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 获取单个基金净值
// 优先使用东方财富移动端API，失败时回退到天天基金网接口
async function fetchFundNetWorth(code: string) {
  try {
    // 优先尝试东方财富移动端API（更可靠）
    try {
      const eastmoneyUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=20&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123&Fcodes=${code}`;
      const eastmoneyResponse = await fetch(eastmoneyUrl, {
        cache: 'no-store',
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
          return {
            success: true,
            code: fund.FCODE,
            netWorth: fund.NAV,
            netWorthDate: fund.PDATE || '',
          };
        }
      }
    } catch (eastmoneyError) {
      // 如果东方财富API失败，继续尝试旧接口
      // 不记录错误，静默失败
    }

    // 备用方案：使用天天基金网的JSONP接口
    const url = `http://fundgz.1234567.com.cn/js/${code}.js`;
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();

    // 检查响应是否为空
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        code,
        error: '接口返回空数据',
      };
    }

    // 解析JSONP响应：jsonpgz({"fundcode":"513500",...});
    const jsonMatch = text.match(/jsonpgz\((.*)\)/);
    if (!jsonMatch || !jsonMatch[1] || jsonMatch[1].trim().length === 0) {
      // 检查是否是空响应 jsonpgz();
      if (text.trim() === 'jsonpgz();' || text.trim() === 'jsonpgz()') {
        return {
          success: false,
          code,
          error: '基金不存在或已停售',
        };
      }
      return {
        success: false,
        code,
        error: '解析净值数据失败',
      };
    }

    let fundData;
    try {
      fundData = JSON.parse(jsonMatch[1]);
    } catch (parseError) {
      console.error(
        `解析基金 ${code} 数据失败:`,
        parseError,
        '原始响应:',
        text
      );
      return {
        success: false,
        code,
        error: '解析JSON数据失败',
      };
    }

    // 检查数据是否有效
    if (!fundData || (!fundData.dwjz && !fundData.gsz)) {
      return {
        success: false,
        code,
        error: '基金不存在或已停售',
      };
    }

    return {
      success: true,
      code: fundData.fundcode,
      netWorth: fundData.dwjz || fundData.gsz,
      netWorthDate: fundData.jzrq || '',
    };
  } catch (error) {
    return {
      success: false,
      code,
      error: error instanceof Error ? error.message : '获取失败',
    };
  }
}

export async function POST(request: Request) {
  try {
    const { directionId } = await request.json();

    // 构建查询条件
    const where: {
      directionId?: number;
    } = {};

    // 如果提供了 directionId，添加到查询条件中
    if (directionId) {
      where.directionId = parseInt(directionId);
    }

    // 获取所有需要更新的基金（有code的基金）
    // 注意：code 字段在 schema 中是必需的 String 类型，所以不需要过滤 null
    const funds = await prisma.fund.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (funds.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要更新的基金',
        results: [],
      });
    }

    const results = [];

    // 逐个更新，每次请求间隔 500ms 避免限流
    for (const fund of funds) {
      if (!fund.code) continue;

      const result = await fetchFundNetWorth(fund.code);

      if (result.success) {
        // 更新数据库
        await prisma.fund.update({
          where: { id: fund.id },
          data: {
            latestNetWorth: result.netWorth,
            netWorthDate: result.netWorthDate,
            netWorthUpdateAt: new Date(),
          },
        });

        results.push({
          fundId: fund.id,
          fundName: fund.name,
          code: fund.code,
          success: true,
          netWorth: result.netWorth,
          netWorthDate: result.netWorthDate,
        });
      } else {
        results.push({
          fundId: fund.id,
          fundName: fund.name,
          code: fund.code,
          success: false,
          error: result.error,
        });
      }

      // 延迟 500ms 避免触发限流
      await delay(500);
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `更新完成：成功 ${successCount} 个，失败 ${failCount} 个`,
      total: funds.length,
      successCount,
      failCount,
      results,
    });
  } catch (error: unknown) {
    console.error('批量更新净值失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: '批量更新失败', details: message },
      { status: 500 }
    );
  }
}
