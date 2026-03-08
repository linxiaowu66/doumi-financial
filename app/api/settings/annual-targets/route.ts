import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const targets = await prisma.annualProfitTarget.findMany({
      orderBy: { year: "desc" },
    });
    return NextResponse.json(targets);
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
