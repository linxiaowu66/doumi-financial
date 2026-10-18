import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { buildFundSignalResult } from "@/lib/fund-signal-engine";

const STATUS = new Set(["PENDING", "EXECUTED", "PARTIAL", "SKIPPED"]);

function dateValue(value: unknown) {
  const date = new Date(String(value || ""));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const signalDate = searchParams.get("date") || undefined;
  const executions = await prisma.fundSignalExecution.findMany({
    where: { userId, ...(signalDate ? { signalDate } : {}) },
    include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } },
    orderBy: [{ signalDate: "desc" }, { updatedAt: "desc" }],
    take: 200,
  });
  return NextResponse.json(executions.map((item) => ({ ...item, suggestedAmount: Number(item.suggestedAmount), executedAmount: Number(item.executedAmount), executionPrice: item.executionPrice === null ? null : Number(item.executionPrice) })));
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const fundId = Number(body.fundId);
    const signalDate = String(body.signalDate || "").slice(0, 10);
    const status = String(body.status || "PENDING");
    const executedAmount = Number(body.executedAmount || 0);
    if (!Number.isInteger(fundId) || fundId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(signalDate)) return NextResponse.json({ error: "基金或信号日期无效" }, { status: 400 });
    if (!STATUS.has(status) || !Number.isFinite(executedAmount) || executedAmount < 0) return NextResponse.json({ error: "执行状态或金额无效" }, { status: 400 });
    const snapshot = await prisma.fundSignalDailySnapshot.findFirst({ where: { userId, fundId, date: signalDate, action: { in: ["BUY", "SELL"] } }, include: { fund: { select: { directionId: true } } } });
    const liveSignal = snapshot ? null : (await buildFundSignalResult(userId)).signals.find((item) => item.fundId === fundId && item.action !== "NONE" && item.actionAmount > 0);
    if (!snapshot && !liveSignal) return NextResponse.json({ error: "找不到可确认的买卖信号，请先生成当日信号" }, { status: 404 });
    const action = snapshot?.action || liveSignal!.action;
    const directionId = snapshot?.fund.directionId || liveSignal!.directionId;
    const suggestedAmount = snapshot ? Number(snapshot.actionAmount) : liveSignal!.actionAmount;
    if (status === "EXECUTED" && executedAmount <= 0) return NextResponse.json({ error: "已执行状态需要填写实际金额" }, { status: 400 });
    if (status === "PARTIAL" && (executedAmount <= 0 || executedAmount >= suggestedAmount)) return NextResponse.json({ error: "部分执行金额必须大于 0 且小于建议金额" }, { status: 400 });
    const executedDate = status === "SKIPPED" || status === "PENDING" ? null : dateValue(body.executedDate) || new Date();
    const execution = await prisma.fundSignalExecution.upsert({
      where: { userId_fundId_signalDate: { userId, fundId, signalDate } },
      create: { userId, fundId, directionId, signalDate, action, suggestedAmount, status, executedAmount: status === "SKIPPED" || status === "PENDING" ? 0 : executedAmount, executedDate, executionPrice: body.executionPrice ? Number(body.executionPrice) : null, note: typeof body.note === "string" ? body.note.trim() || null : null },
      update: { action, suggestedAmount, status, executedAmount: status === "SKIPPED" || status === "PENDING" ? 0 : executedAmount, executedDate, executionPrice: body.executionPrice ? Number(body.executionPrice) : null, note: typeof body.note === "string" ? body.note.trim() || null : null },
      include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } },
    });
    return NextResponse.json({ ...execution, suggestedAmount: Number(execution.suggestedAmount), executedAmount: Number(execution.executedAmount), executionPrice: execution.executionPrice === null ? null : Number(execution.executionPrice) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存信号执行记录失败" }, { status: 400 });
  }
}
