import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { buildFundSignalResult } from "@/lib/fund-signal-engine";

const ACCOUNT_NAME = "默认虚拟信号账户";

type Positions = Record<string, number>;

function parsePositions(value: string | null | undefined): Positions {
  try {
    const parsed = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, Number(item)]).filter(([, item]) => Number.isFinite(Number(item)) && Number(item) > 0));
  } catch {
    return {};
  }
}

function addTradePositions(positions: Positions, trades: Array<{ fundId: number; action: string; shares: unknown }>) {
  for (const trade of trades) {
    const delta = Number(trade.shares) * (trade.action === "SELL" ? -1 : 1);
    positions[String(trade.fundId)] = (positions[String(trade.fundId)] || 0) + delta;
  }
  return positions;
}

async function seedCurrentHoldings(userId: number) {
  const funds = await prisma.fund.findMany({
    where: { direction: { userId } },
    select: { id: true, transactions: { select: { type: true, shares: true }, orderBy: [{ date: "asc" }, { id: "asc" }] } },
  });
  const positions: Positions = {};
  for (const fund of funds) {
    let shares = 0;
    for (const transaction of fund.transactions) {
      if (transaction.type === "BUY" || (transaction.type === "DIVIDEND" && Number(transaction.shares) > 0)) shares += Number(transaction.shares);
      if (transaction.type === "SELL") shares -= Number(transaction.shares);
    }
    if (shares > 0) positions[String(fund.id)] = shares;
  }
  return positions;
}

function serialize(account: { id: number; name: string; initialCash: unknown; cash: unknown; asOfDate: string | null; startingPositionsJson: string | null; trades: Array<{ id: number; fundId: number; signalDate: string; action: string; amount: unknown; price: unknown; shares: unknown; fee: unknown; reason: string | null; fund: { name: string; code: string }; direction: { name: string } }> }) {
  const positions = addTradePositions(parsePositions(account.startingPositionsJson), account.trades);
  return {
    id: account.id,
    name: account.name,
    initialCash: Number(account.initialCash),
    cash: Number(account.cash),
    asOfDate: account.asOfDate,
    positions: Object.entries(positions).filter(([, shares]) => shares > 0.000001).map(([fundId, shares]) => ({ fundId: Number(fundId), shares })),
    trades: account.trades.map((trade) => ({ ...trade, amount: Number(trade.amount), price: Number(trade.price), shares: Number(trade.shares), fee: Number(trade.fee) })),
  };
}

async function loadAccount(userId: number) {
  return prisma.signalVirtualAccount.findUnique({
    where: { userId_name: { userId, name: ACCOUNT_NAME } },
    include: { trades: { include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } }, orderBy: { signalDate: "desc" } } },
  });
}

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const account = await loadAccount(userId);
  return NextResponse.json({ account: account ? serialize(account) : null });
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const initialize = body.initialize === true;
    const seedFromCurrentHoldings = body.seedFromCurrentHoldings !== false;
    const initialCash = Number(body.initialCash ?? 0);
    if (initialize && (!Number.isFinite(initialCash) || initialCash < 0)) return NextResponse.json({ error: "初始现金必须是非负数字" }, { status: 400 });

    let account = await loadAccount(userId);
    if (initialize) {
      const startingPositions = seedFromCurrentHoldings ? await seedCurrentHoldings(userId) : parsePositions(account?.startingPositionsJson);
      if (!account) {
        account = await prisma.signalVirtualAccount.create({ data: { userId, name: ACCOUNT_NAME, initialCash, cash: initialCash, startingPositionsJson: JSON.stringify(startingPositions) }, include: { trades: { include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } } } } });
      } else if (account.trades.length === 0) {
        account = await prisma.signalVirtualAccount.update({ where: { id: account.id }, data: { initialCash, cash: initialCash, startingPositionsJson: JSON.stringify(startingPositions), asOfDate: null }, include: { trades: { include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } } } } });
      }
      return NextResponse.json({ account: serialize(account) });
    }

    if (!account) return NextResponse.json({ error: "请先在策略中枢初始化虚拟信号账户" }, { status: 400 });
    const fundId = Number(body.fundId);
    const signalDate = String(body.signalDate || "").slice(0, 10);
    const amount = Number(body.amount);
    if (!Number.isInteger(fundId) || fundId <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(signalDate) || !Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "基金、信号日期或金额无效" }, { status: 400 });
    const fund = await prisma.fund.findFirst({ where: { id: fundId, direction: { userId } }, select: { id: true, directionId: true, defaultBuyFee: true, defaultSellFee: true } });
    if (!fund) return NextResponse.json({ error: "基金不属于当前用户" }, { status: 404 });
    const [nextPriceRow, latestPriceRow] = await Promise.all([
      prisma.fundNetWorthHistory.findFirst({ where: { fundId, date: { gt: signalDate } }, orderBy: { date: "asc" }, select: { netWorth: true } }),
      prisma.fundNetWorthHistory.findFirst({ where: { fundId }, orderBy: { date: "desc" }, select: { netWorth: true } }),
    ]);
    const snapshot = await prisma.fundSignalDailySnapshot.findFirst({ where: { userId, fundId, date: signalDate, action: { in: ["BUY", "SELL"] } }, select: { action: true, reason: true } });
    const liveSignal = snapshot ? null : (await buildFundSignalResult(userId)).signals.find((item) => item.fundId === fundId && item.action !== "NONE" && item.actionAmount > 0);
    const action = snapshot?.action || liveSignal?.action;
    if (action !== "BUY" && action !== "SELL") return NextResponse.json({ error: "找不到该日期的买卖信号" }, { status: 404 });
    const price = Number(body.executionPrice || nextPriceRow?.netWorth || latestPriceRow?.netWorth || 0);
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "找不到可用成交净值" }, { status: 400 });
    const feePercent = Number(action === "BUY" ? fund.defaultBuyFee : fund.defaultSellFee);
    const fee = amount * feePercent / 100;
    const shares = amount / price;
    const positions = addTradePositions(parsePositions(account.startingPositionsJson), account.trades);
    const currentShares = positions[String(fundId)] || 0;
    const cash = Number(account.cash);
    if (action === "BUY" && cash < amount + fee - 0.005) return NextResponse.json({ error: `虚拟账户现金不足，需要 ¥${(amount + fee).toFixed(2)}` }, { status: 400 });
    if (action === "SELL" && currentShares + 0.000001 < shares) return NextResponse.json({ error: "虚拟账户份额不足；初始化时可同步当前持仓" }, { status: 400 });
    const trade = await prisma.$transaction(async (tx) => {
      await tx.signalVirtualTrade.create({ data: { virtualAccountId: account!.id, directionId: fund.directionId, fundId, signalDate, action, amount, price, shares, fee, reason: snapshot?.reason || liveSignal?.reason || null } });
      return tx.signalVirtualAccount.update({ where: { id: account!.id }, data: { cash: action === "BUY" ? { decrement: amount + fee } : { increment: amount - fee }, asOfDate: signalDate }, include: { trades: { include: { fund: { select: { name: true, code: true } }, direction: { select: { name: true } } }, orderBy: { signalDate: "desc" } } } });
    });
    return NextResponse.json({ account: serialize({ ...trade, initialCash: account.initialCash, startingPositionsJson: account.startingPositionsJson }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存虚拟信号失败" }, { status: 400 });
  }
}
