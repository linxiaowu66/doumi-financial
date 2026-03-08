import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import dayjs from "dayjs";

export async function GET() {
  try {
    const currentYear = dayjs().year();
    const startOfYear = dayjs().startOf("year").toDate();
    const endOfYear = dayjs().endOf("year").toDate();

    // Calculate the sum of dailyProfit for the current year
    const result = await prisma.directionDailyProfit.aggregate({
      _sum: {
        dailyProfit: true,
      },
      where: {
        date: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });

    const actualAmount = result._sum.dailyProfit || 0;

    // Update the actualAmount of the AnnualProfitTarget for the current year
    await prisma.annualProfitTarget.upsert({
      where: { year: currentYear },
      update: { actualAmount },
      create: {
        year: currentYear,
        targetAmount: 0, // Default target amount if not set
        actualAmount,
      },
    });

    return NextResponse.json({ success: true, year: currentYear, actualAmount });
  } catch (error) {
    console.error("Failed to calculate annual profit:", error);
    return NextResponse.json({ error: "Failed to calculate annual profit" }, { status: 500 });
  }
}
