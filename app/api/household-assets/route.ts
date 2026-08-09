import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { buildMonthlyHouseholdHistory } from "@/lib/household-assets";
import { calculateDirectionMarketValue } from "@/lib/fund-daily-profit";

const PLATFORMS = ["QIEMAN", "YUEBAO", "HUATAI", "PERSONAL_PENSION", "OTHER"];
const POLICY_TYPES = ["ACCIDENT", "CRITICAL_ILLNESS", "LIFE", "MEDICAL", "NURSING", "OTHER"];

async function getUserId(): Promise<number | null> {
  const session = await auth();
  const userId = Number(session?.user?.id);
  return Number.isInteger(userId) ? userId : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function date(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ownsMember(userId: number, memberId: number | null): Promise<boolean> {
  if (memberId === null) return true;
  return Boolean(await prisma.householdMember.findFirst({ where: { id: memberId, userId }, select: { id: true } }));
}

function unauthorized() {
  return NextResponse.json({ error: "未登录" }, { status: 401 });
}

function invalid(message = "参数无效") {
  return NextResponse.json({ error: message }, { status: 400 });
}

function directionOwnership(userId: number) {
  return {
    OR: [
      { userId },
      { householdMember: { userId } },
    ],
  };
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const memberIdParam = searchParams.get("memberId");
  const memberId = memberIdParam ? Number(memberIdParam) : null;
  if (memberId !== null && (!Number.isInteger(memberId) || !await ownsMember(userId, memberId))) {
    return invalid("家庭成员不存在");
  }

  const members = await prisma.householdMember.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (searchParams.get("membersOnly") === "1") return NextResponse.json({ members });

  const [assets, policies, directions] = await Promise.all([
    prisma.householdAsset.findMany({
      where: { userId, ...(memberId === null ? {} : { memberId }) },
      include: {
        member: true,
        histories: { orderBy: [{ asOfDate: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: [{ platform: "asc" }, { name: "asc" }],
    }),
    prisma.insurancePolicy.findMany({
      where: { userId, ...(memberId === null ? {} : { insuredMemberId: memberId }) },
      include: {
        insuredMember: true,
        premiumPayments: { orderBy: { year: "desc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.investmentDirection.findMany({
      where: {
        ...directionOwnership(userId),
        ...(memberId === null ? {} : { householdMemberId: memberId }),
      },
      include: {
        householdMember: true,
        householdSnapshots: { orderBy: [{ asOfDate: "asc" }, { createdAt: "asc" }] },
        funds: { include: { transactions: { orderBy: { date: "asc" } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const directionRows = directions.map((direction) => {
    const latestSnapshot = direction.householdSnapshots.at(-1) || null;
    return {
      id: direction.id,
      name: direction.name,
      type: direction.type,
      householdMemberId: direction.householdMemberId,
      householdMember: direction.householdMember,
      currentValue: calculateDirectionMarketValue(direction.funds),
      snapshotValue: latestSnapshot?.value ?? null,
      snapshotAsOfDate: latestSnapshot?.asOfDate ?? null,
    };
  });
  const history = buildMonthlyHouseholdHistory(
    assets.flatMap((asset) => asset.histories.map((snapshot) => ({
      sourceId: asset.id,
      category: asset.platform,
      value: snapshot.balance.toString(),
      date: snapshot.asOfDate,
    }))),
    directions.flatMap((direction) => direction.householdSnapshots.map((snapshot) => ({
      sourceId: direction.id,
      value: snapshot.value.toString(),
      date: snapshot.asOfDate,
    }))),
  );
  const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const maintenanceDates = [
    ...assets.map((asset) => asset.asOfDate),
    ...directions.map((direction) => direction.householdSnapshots.find((snapshot) => snapshot.month === currentMonth)?.asOfDate ?? ""),
  ];

  return NextResponse.json({ members, assets, policies, directions: directionRows, history, maintenanceDates });
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await request.json() as Record<string, unknown>;
  const resource = text(body.resource);

  if (resource === "member") {
    const name = text(body.name);
    if (!name) return invalid("成员姓名不能为空");
    return NextResponse.json(await prisma.householdMember.create({
      data: { userId, name, relation: text(body.relation) || null },
    }));
  }

  if (resource === "asset") {
    const name = text(body.name);
    const platform = text(body.platform);
    const balance = amount(body.balance);
    const asOfDate = date(body.asOfDate);
    const memberId = body.memberId ? Number(body.memberId) : null;
    if (!name || !PLATFORMS.includes(platform) || balance === null || !asOfDate || (memberId !== null && !Number.isInteger(memberId))) {
      return invalid("请完整填写资产账户信息");
    }
    if (!await ownsMember(userId, memberId)) return invalid("家庭成员不存在");
    return NextResponse.json(await prisma.householdAsset.create({
      data: {
        userId,
        memberId,
        name,
        platform,
        balance,
        asOfDate,
        remark: text(body.remark) || null,
        histories: { create: { balance, asOfDate } },
      },
      include: { member: true, histories: true },
    }));
  }

  if (resource === "syncDirections") {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const directions = await prisma.investmentDirection.findMany({
      where: directionOwnership(userId),
      include: { funds: { include: { transactions: { orderBy: { date: "asc" } } } } },
    });
    await prisma.$transaction(directions.map((direction) => {
      const value = calculateDirectionMarketValue(direction.funds);
      return prisma.householdDirectionSnapshot.upsert({
        where: { directionId_month: { directionId: direction.id, month } },
        update: { value, asOfDate: now },
        create: { directionId: direction.id, month, value, asOfDate: now },
      });
    }));
    return NextResponse.json({ success: true, count: directions.length, month });
  }

  if (resource === "policy") {
    const name = text(body.name);
    const type = text(body.type);
    const coverageAmount = amount(body.coverageAmount);
    const annualPremium = amount(body.annualPremium);
    const refundableAmount = amount(body.refundableAmount);
    const insuredMemberId = body.insuredMemberId ? Number(body.insuredMemberId) : null;
    const startDate = date(body.startDate);
    const maturityDate = date(body.maturityDate);
    if (!name || !POLICY_TYPES.includes(type) || coverageAmount === null || annualPremium === null || refundableAmount === null || (insuredMemberId !== null && !Number.isInteger(insuredMemberId)) || (body.startDate && !startDate) || (body.maturityDate && !maturityDate)) {
      return invalid("请完整填写保单信息");
    }
    if (!await ownsMember(userId, insuredMemberId)) return invalid("被保人不存在");
    return NextResponse.json(await prisma.insurancePolicy.create({
      data: {
        userId,
        insuredMemberId,
        name,
        provider: text(body.provider) || null,
        type,
        coverageAmount,
        annualPremium,
        startDate,
        maturityDate,
        refundableAmount,
        active: body.active !== false,
        remark: text(body.remark) || null,
      },
      include: { insuredMember: true, premiumPayments: true },
    }));
  }

  if (resource === "payment") {
    const policyId = Number(body.policyId);
    const year = Number(body.year);
    const paymentAmount = amount(body.amount);
    const paidAt = date(body.paidAt);
    const policy = await prisma.insurancePolicy.findFirst({ where: { id: policyId, userId }, select: { id: true } });
    if (!policy || !Number.isInteger(year) || year < 2000 || year > 2100 || paymentAmount === null || !paidAt) {
      return invalid("缴费信息无效");
    }
    return NextResponse.json(await prisma.insurancePremiumPayment.upsert({
      where: { policyId_year: { policyId, year } },
      update: { amount: paymentAmount, paidAt, remark: text(body.remark) || null },
      create: { policyId, year, amount: paymentAmount, paidAt, remark: text(body.remark) || null },
    }));
  }

  return invalid("未知资源类型");
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const body = await request.json() as Record<string, unknown>;
  const resource = text(body.resource);
  const id = Number(body.id);
  if (!Number.isInteger(id)) return invalid();

  if (resource === "member") {
    const name = text(body.name);
    if (!name) return invalid("成员姓名不能为空");
    const result = await prisma.householdMember.updateMany({
      where: { id, userId },
      data: { name, relation: text(body.relation) || null },
    });
    if (!result.count) return NextResponse.json({ error: "成员不存在" }, { status: 404 });
    return NextResponse.json(await prisma.householdMember.findUnique({ where: { id } }));
  }

  if (resource === "asset") {
    const name = text(body.name);
    const platform = text(body.platform);
    const balance = amount(body.balance);
    const asOfDate = date(body.asOfDate);
    const memberId = body.memberId ? Number(body.memberId) : null;
    if (!name || !PLATFORMS.includes(platform) || balance === null || !asOfDate || (memberId !== null && !Number.isInteger(memberId))) return invalid("请完整填写资产账户信息");
    if (!await ownsMember(userId, memberId)) return invalid("家庭成员不存在");
    const existing = await prisma.householdAsset.findFirst({ where: { id, userId } });
    if (!existing) return NextResponse.json({ error: "资产账户不存在" }, { status: 404 });
    const balanceChanged = !existing.balance.equals(balance);
    const dateChanged = existing.asOfDate.getTime() !== asOfDate.getTime();
    return NextResponse.json(await prisma.householdAsset.update({
      where: { id },
      data: {
        memberId,
        name,
        platform,
        balance,
        asOfDate,
        remark: text(body.remark) || null,
        ...(balanceChanged || dateChanged ? { histories: { create: { balance, asOfDate } } } : {}),
      },
      include: { member: true, histories: { orderBy: [{ asOfDate: "asc" }, { createdAt: "asc" }] } },
    }));
  }

  if (resource === "policy") {
    const name = text(body.name);
    const type = text(body.type);
    const coverageAmount = amount(body.coverageAmount);
    const annualPremium = amount(body.annualPremium);
    const refundableAmount = amount(body.refundableAmount);
    const insuredMemberId = body.insuredMemberId ? Number(body.insuredMemberId) : null;
    const startDate = date(body.startDate);
    const maturityDate = date(body.maturityDate);
    if (!name || !POLICY_TYPES.includes(type) || coverageAmount === null || annualPremium === null || refundableAmount === null || (insuredMemberId !== null && !Number.isInteger(insuredMemberId)) || (body.startDate && !startDate) || (body.maturityDate && !maturityDate)) return invalid("请完整填写保单信息");
    if (!await ownsMember(userId, insuredMemberId)) return invalid("被保人不存在");
    const result = await prisma.insurancePolicy.updateMany({
      where: { id, userId },
      data: {
        insuredMemberId,
        name,
        provider: text(body.provider) || null,
        type,
        coverageAmount,
        annualPremium,
        startDate,
        maturityDate,
        refundableAmount,
        active: body.active !== false,
        remark: text(body.remark) || null,
      },
    });
    if (!result.count) return NextResponse.json({ error: "保单不存在" }, { status: 404 });
    return NextResponse.json(await prisma.insurancePolicy.findUnique({
      where: { id },
      include: { insuredMember: true, premiumPayments: { orderBy: { year: "desc" } } },
    }));
  }

  return invalid("未知资源类型");
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource");
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id)) return invalid();

  const result = resource === "member"
    ? await prisma.householdMember.deleteMany({ where: { id, userId } })
    : resource === "asset"
      ? await prisma.householdAsset.deleteMany({ where: { id, userId } })
      : resource === "policy"
        ? await prisma.insurancePolicy.deleteMany({ where: { id, userId } })
        : null;

  if (!result) return invalid("未知资源类型");
  if (!result.count) return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  return NextResponse.json({ success: true });
}
