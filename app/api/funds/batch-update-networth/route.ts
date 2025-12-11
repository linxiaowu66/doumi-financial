import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 延迟函数，用于避免限流
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 获取单个基金净值
async function fetchFundNetWorth(code: string) {
  try {
    const url = `http://fundgz.1234567.com.cn/js/${code}.js`;
    const response = await fetch(url, { cache: 'no-store' });
    const text = await response.text();

    const jsonMatch = text.match(/jsonpgz\((.*)\)/);
    if (!jsonMatch) {
      throw new Error('解析净值数据失败');
    }

    const fundData = JSON.parse(jsonMatch[1]);

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

    // 获取所有需要更新的基金（有code的基金）
    const funds = await prisma.fund.findMany({
      where: {
        directionId: directionId ? parseInt(directionId) : undefined,
        code: {
          not: null,
        },
      },
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
