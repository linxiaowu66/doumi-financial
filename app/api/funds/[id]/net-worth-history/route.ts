import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/funds/[id]/net-worth-history?days=90
// 返回该基金本地存储的净值历史，按日期升序
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "90");

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    const history = await prisma.fundNetWorthHistory.findMany({
      where: {
        fundId: parseInt(id),
        date: { gte: sinceStr },
      },
      orderBy: { date: "asc" },
      select: { date: true, netWorth: true },
    });

    return NextResponse.json(
      history.map((h) => ({
        date: h.date,
        netWorth: parseFloat(h.netWorth.toString()),
      }))
    );
  } catch (error) {
    console.error("获取净值历史失败:", error);
    return NextResponse.json({ error: "获取净值历史失败" }, { status: 500 });
  }
}
