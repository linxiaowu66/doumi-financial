import { NextResponse } from 'next/server';
import {
  saveAllDirectionsDailyProfit,
  saveDirectionDailyProfitRange,
} from '@/lib/direction-daily-profit';
import { updateActualAmountByFundId } from '@/lib/investment-direction';
import prisma from '@/lib/prisma';

// 延迟函数，用于避免限流
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 获取单个基金净值（复用批量更新的逻辑）
async function fetchFundNetWorth(code: string) {
  try {
    // 优先尝试东方财富移动端API
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
      // 静默失败，继续尝试备用接口
    }

    // 备用方案：使用天天基金网的JSONP接口
    const url = `http://fundgz.1234567.com.cn/js/${code}.js`;
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();

    if (!text || text.trim().length === 0) {
      return { success: false, code, error: '接口返回空数据' };
    }

    const jsonMatch = text.match(/jsonpgz\((.*)\)/);
    if (!jsonMatch || !jsonMatch[1] || jsonMatch[1].trim().length === 0) {
      if (text.trim() === 'jsonpgz();' || text.trim() === 'jsonpgz()') {
        return { success: false, code, error: '基金不存在或已停售' };
      }
      return { success: false, code, error: '解析净值数据失败' };
    }

    let fundData;
    try {
      fundData = JSON.parse(jsonMatch[1]);
    } catch (parseError) {
      return { success: false, code, error: '解析JSON数据失败' };
    }

    if (!fundData || (!fundData.dwjz && !fundData.gsz)) {
      return { success: false, code, error: '基金不存在或已停售' };
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

// POST - 定时任务：更新所有基金的净值并计算每日盈亏
// 这个API应该由外部定时任务（如cron）调用
export async function POST(request: Request) {
  try {
    // 验证请求来源（可选，增加安全性）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {
      netWorthUpdate: { success: 0, failed: 0, errors: [] as string[] },
      dailyProfit: { success: 0, failed: 0, errors: [] as string[] },
    };

    // 1. 更新所有基金的净值
    try {
      const funds = await prisma.fund.findMany({
        where: {
          code: { not: null },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      for (const fund of funds) {
        if (!fund.code) continue;

        const result = await fetchFundNetWorth(fund.code);

        if (result.success) {
          await prisma.fund.update({
            where: { id: fund.id },
            data: {
              latestNetWorth: result.netWorth,
              netWorthDate: result.netWorthDate,
              netWorthUpdateAt: new Date(),
            },
          });
          results.netWorthUpdate.success++;
        } else {
          results.netWorthUpdate.failed++;
          results.netWorthUpdate.errors.push(
            `基金 ${fund.code}: ${result.error || '获取失败'}`
          );
        }

        // 延迟避免限流
        await delay(500);
      }
    } catch (error) {
      results.netWorthUpdate.errors.push(
        `更新净值失败: ${error instanceof Error ? error.message : '未知错误'}`
      );
    }

    // 2. 更新所有投资方向的实际投入金额
    try {
      const directions = await prisma.investmentDirection.findMany({
        select: { id: true },
      });

      for (const direction of directions) {
        try {
          // 获取该方向下的所有基金
          const funds = await prisma.fund.findMany({
            where: { directionId: direction.id },
            select: { id: true },
          });

          // 更新实际投入（通过更新第一个基金来触发）
          if (funds.length > 0) {
            await updateActualAmountByFundId(funds[0].id);
          }
        } catch (error) {
          console.error(`更新投资方向 ${direction.id} 实际投入失败:`, error);
        }
      }
    } catch (error) {
      console.error('批量更新实际投入失败:', error);
    }

    // 3. 计算并保存所有投资方向的每日盈亏（使用历史净值）
    // 为每个投资方向回填最近1天的数据（即今天），使用历史净值API确保准确性
    const directions = await prisma.investmentDirection.findMany({
      select: { id: true },
    });

    for (const direction of directions) {
      try {
        // 回填最近1天（即今天），会自动获取历史净值
        const result = await saveDirectionDailyProfitRange(direction.id, 1);
        if (result.success > 0) {
          results.dailyProfit.success++;
        } else {
          results.dailyProfit.failed++;
          results.dailyProfit.errors.push(
            ...result.errors.map((e) => `投资方向 ${direction.id}: ${e}`)
          );
        }
      } catch (error) {
        results.dailyProfit.failed++;
        results.dailyProfit.errors.push(
          `投资方向 ${direction.id}: ${
            error instanceof Error ? error.message : '未知错误'
          }`
        );
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: '定时任务执行完成',
      duration: `${(duration / 1000).toFixed(2)}秒`,
      results,
    });
  } catch (error: unknown) {
    console.error('定时任务执行失败:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        error: '定时任务执行失败',
        message,
      },
      { status: 500 }
    );
  }
}

// GET - 手动触发（用于测试）
export async function GET() {
  return NextResponse.json({
    message: '请使用 POST 方法调用此API',
    usage: 'POST /api/cron/daily-profit-calculation',
    note: '建议设置 CRON_SECRET 环境变量以保护此API',
  });
}
