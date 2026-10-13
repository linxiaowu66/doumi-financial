import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const fundId = Number(searchParams.get("fundId"));
  const where = { userId, ...(Number.isInteger(fundId) && fundId > 0 ? { fundId } : {}) };
  const snapshots = await prisma.fundSignalDailySnapshot.findMany({ where, orderBy: { date: "desc" }, take: 365, include: { fund: { select: { name: true, code: true } } } });
  return NextResponse.json(snapshots);
}
