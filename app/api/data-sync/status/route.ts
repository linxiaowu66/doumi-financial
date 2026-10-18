import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const runs = await prisma.dataSyncRun.findMany({
    where: { OR: [{ userId }, { userId: null }] },
    orderBy: { startedAt: "desc" },
    take: 30,
  });
  const latest = Object.fromEntries(["NET_WORTH", "QIEMAN", "METADATA"].map((kind) => [kind, runs.find((run) => run.kind === kind) || null]));
  return NextResponse.json({ latest, runs });
}
