import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import dayjs from "dayjs";

export async function GET() {
  try {
    const targets = await prisma.annualProfitTarget.findMany({
      orderBy: { year: "desc" },
    });
    const targetsWithActual = await Promise.all(targets.map(async (target) => {
      if (target.actualAmount !== null) return target;
      const records = await prisma.directionDailyProfit.aggregate({
        where: {
          date: {
            gte: dayjs(`${target.year}-01-01`).startOf("day").toDate(),
            lt: dayjs(`${target.year + 1}-01-01`).startOf("day").toDate(),
          },
        },
        _sum: { dailyProfit: true },
      });
      return { ...target, actualAmount: records._sum.dailyProfit || 0 };
    }));
    return NextResponse.json(targetsWithActual);
  } catch (error) {
    console.error("Failed to fetch annual targets:", error);
    return NextResponse.json({ error: "Failed to fetch annual targets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { year, targetAmount } = body;

    if (!year || targetAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const target = await prisma.annualProfitTarget.upsert({
      where: { year: Number(year) },
      update: { targetAmount: Number(targetAmount) },
      create: {
        year: Number(year),
        targetAmount: Number(targetAmount),
      },
    });

    return NextResponse.json(target);
  } catch (error) {
    console.error("Failed to save annual target:", error);
    return NextResponse.json({ error: "Failed to save annual target" }, { status: 500 });
  }
}
