import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { backfillFundDailyProfit } from "@/lib/fund-daily-profit";

// GET - 获取基金历史盈亏数据（用于图表）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const fundId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "365");

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const [history, transactions] = await Promise.all([
      prisma.fundDailyProfit.findMany({
        where: { fundId, date: { gte: sinceStr } },
        orderBy: { date: "asc" },
        select: {
          date: true,
          dailyProfit: true,
          cumulativeProfit: true,
          cumulativeProfitRate: true,
          holdingCost: true,
          holdingValue: true,
          holdingShares: true,
          totalInvested: true,
          isNewHigh: true,
          isNewLow: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          fundId,
          date: { gte: since },
          type: { in: ["BUY", "SELL"] },
        },
        orderBy: { date: "asc" },
        select: {
          id: true,
          type: true,
          amount: true,
          shares: true,
          price: true,
          date: true,
        },
      }),
    ]);

    return NextResponse.json({
      history: history.map((r) => ({
        date: r.date,
        dailyProfit: parseFloat(r.dailyProfit.toString()),
        cumulativeProfit: parseFloat(r.cumulativeProfit.toString()),
        cumulativeProfitRate: parseFloat(r.cumulativeProfitRate.toString()),
        holdingCost: parseFloat(r.holdingCost.toString()),
        holdingValue: parseFloat(r.holdingValue.toString()),
        holdingShares: parseFloat(r.holdingShares.toString()),
        totalInvested: parseFloat(r.totalInvested.toString()),
        isNewHigh: r.isNewHigh,
        isNewLow: r.isNewLow,
      })),
      transactions: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount.toString()),
        shares: parseFloat(tx.shares.toString()),
        price: parseFloat(tx.price.toString()),
        date: tx.date.toISOString().slice(0, 10),
      })),
    });
  } catch (error) {
    console.error("获取基金盈亏历史失败:", error);
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

// POST - 回填/重算该基金的全部历史盈亏数据
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const fundId = parseInt(id);

    const result = await backfillFundDailyProfit(fundId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("回填基金盈亏历史失败:", error);
    return NextResponse.json({ error: "回填失败" }, { status: 500 });
  }
}
