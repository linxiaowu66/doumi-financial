import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function qiemanPropertyIds(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.flatMap((item) => text(item).split(/[,\s，、;；]+/).map((part) => {
    const match = part.match(/\/properties\/([^/?#]+)/i);
    return match ? decodeURIComponent(match[1]) : part;
  }).filter(Boolean)))];
}

async function ensureStrategyAccounts(userId: number) {
  const assets = await prisma.householdAsset.findMany({ where: { userId, platform: "QIEMAN", strategyName: { not: null } }, select: { id: true, name: true, platform: true, strategyName: true } });
  for (const asset of assets) {
    const [managerName, strategyName] = (asset.strategyName || "").split("｜").map((item) => item.trim());
    await prisma.strategyAccount.upsert({
      where: { householdAssetId: asset.id },
      update: { name: asset.name, managerName: managerName || null, strategyName: strategyName || asset.strategyName, platform: asset.platform },
      create: { userId, householdAssetId: asset.id, name: asset.name, managerName: managerName || null, strategyName: strategyName || asset.strategyName, platform: asset.platform },
    });
  }
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  await ensureStrategyAccounts(userId);
  const accounts = await prisma.strategyAccount.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      householdAssetId: true,
      name: true,
      managerName: true,
      strategyName: true,
      platform: true,
      sourceType: true,
      qiemanUserPropertyId: true,
      qiemanUserPropertyIds: true,
      qiemanBearerToken: true,
      asOfDate: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      householdAsset: { select: { id: true, name: true, balance: true, asOfDate: true } },
      holdings: { orderBy: [{ asOfDate: "desc" }, { marketValue: "desc" }] },
      imports: { orderBy: { createdAt: "desc" }, take: 10 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(accounts.map(({ qiemanBearerToken, ...account }) => ({ ...account, qiemanTokenConfigured: Boolean(qiemanBearerToken) })));
}

export async function PATCH(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const accountId = Number(body.accountId);
    const hasIdsField = Object.prototype.hasOwnProperty.call(body, "qiemanUserPropertyIds") || Object.prototype.hasOwnProperty.call(body, "qiemanUserPropertyId");
    const idsValue = body.qiemanUserPropertyIds ?? body.qiemanUserPropertyId;
    const qiemanUserPropertyIds = hasIdsField ? qiemanPropertyIds(idsValue) : [];
    const qiemanBearerToken = text(body.qiemanBearerToken);
    const qiemanBearerTokenClear = body.qiemanBearerTokenClear === true;
    if (!Number.isInteger(accountId) || accountId <= 0) return NextResponse.json({ error: "策略账户标识无效" }, { status: 400 });
    if (qiemanUserPropertyIds.some((id) => id.length > 64 || /\s/.test(id))) return NextResponse.json({ error: "且慢 userPropertyId 格式无效" }, { status: 400 });
    if (qiemanBearerToken.length > 4096) return NextResponse.json({ error: "且慢 Token 长度异常" }, { status: 400 });
    const account = await prisma.strategyAccount.findFirst({ where: { id: accountId, userId, platform: "QIEMAN" }, select: { id: true } });
    if (!account) return NextResponse.json({ error: "策略账户不存在" }, { status: 404 });
    const saved = await prisma.strategyAccount.update({
      where: { id: accountId },
      data: {
        ...(hasIdsField ? {
          qiemanUserPropertyId: qiemanUserPropertyIds[0] || null,
          qiemanUserPropertyIds: qiemanUserPropertyIds.length ? JSON.stringify(qiemanUserPropertyIds) : null,
          sourceType: qiemanUserPropertyIds.length ? "QIEMAN_API" : "MANUAL",
        } : {}),
        ...(qiemanBearerTokenClear ? { qiemanBearerToken: null } : qiemanBearerToken ? { qiemanBearerToken } : {}),
      },
      select: { id: true, qiemanUserPropertyId: true, qiemanUserPropertyIds: true, qiemanBearerToken: true, sourceType: true },
    });
    const { qiemanBearerToken: savedToken, ...publicAccount } = saved;
    return NextResponse.json({ success: true, account: { ...publicAccount, qiemanTokenConfigured: Boolean(savedToken) } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存且慢账户标识失败" }, { status: 400 });
  }
}
