import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const reports = await prisma.portfolioStrategyAnalysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, content: true, createdAt: true },
    });
    return NextResponse.json(reports);
  } catch (error) {
    console.error("获取AI策略分析历史失败:", error);
    return NextResponse.json({ error: "获取AI策略分析历史失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.content !== "string" || !body.content.trim()) {
      return NextResponse.json({ error: "策略分析内容不能为空" }, { status: 400 });
    }
    const report = await prisma.portfolioStrategyAnalysis.create({
      data: { content: body.content },
      select: { id: true, content: true, createdAt: true },
    });
    return NextResponse.json(report);
  } catch (error) {
    console.error("保存AI策略分析失败:", error);
    return NextResponse.json({ error: "保存AI策略分析失败" }, { status: 500 });
  }
}
