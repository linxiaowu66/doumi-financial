import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PRECISION_THRESHOLD = 0.03; // 与 funds/[id]/stats 保持一致

// GET - 获取所有投资方向
export async function GET() {
  try {
    const directions = await prisma.investmentDirection.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        funds: {
          include: {
            transactions: {
              orderBy: { date: "asc" },
            },
            pendingTransactions: {
              where: { status: "WAITING" },
            },
          },
        },
      },
    });

    // 为每个投资方向计算最新一笔交易信息、待确认交易数量和未清仓基金数量
    const directionsWithLatestTransaction = directions.map((direction) => {
      // 计算待确认交易总数
      const pendingCount = direction.funds.reduce(
        (acc, fund) => acc + fund.pendingTransactions.length,
        0,
      );

      let activeFundsCount = 0;
      let latestTransaction: { date: Date; type: string; fundName: string } | null = null;

      for (const fund of direction.funds) {
        // 计算持仓份额，判断是否已清仓
        let fundShares = 0;
        for (const tx of fund.transactions) {
          const shares = Number(tx.shares);
          if (tx.type === "BUY") {
            fundShares += shares;
          } else if (tx.type === "SELL") {
            fundShares -= Math.abs(shares);
          } else if (tx.type === "DIVIDEND" && tx.dividendReinvest) {
            fundShares += shares;
          }
        }
        if (Math.abs(fundShares) < PRECISION_THRESHOLD) {
          fundShares = 0;
        }
        if (fundShares > 0) {
          activeFundsCount++;
        }

        // 找该基金的最新交易（transactions 已按 asc 排序，取最后一条）
        if (fund.transactions.length > 0) {
          const lastTx = fund.transactions[fund.transactions.length - 1];
          if (!latestTransaction || lastTx.date.getTime() > latestTransaction.date.getTime()) {
            latestTransaction = { date: lastTx.date, type: lastTx.type, fundName: fund.name };
          }
        }
      }

      // 移除 funds 数据，只保留需要的统计信息
      const { funds: _funds, ...directionWithoutFunds } = direction;

      return {
        ...directionWithoutFunds,
        _count: { funds: activeFundsCount },
        pendingCount,
        latestTransaction,
      };
    });

    return NextResponse.json(directionsWithLatestTransaction);
  } catch (error) {
    console.error("获取投资方向失败:", error);
    return NextResponse.json({ error: "获取投资方向失败" }, { status: 500 });
  }
}

// POST - 创建新的投资方向
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type = "FUND", expectedAmount } = body;

    if (!name || !expectedAmount) {
      return NextResponse.json(
        { error: "名称和预期金额不能为空" },
        { status: 400 },
      );
    }

    const direction = await prisma.investmentDirection.create({
      data: {
        name,
        type,
        expectedAmount: parseFloat(expectedAmount),
      },
    });

    return NextResponse.json(direction);
  } catch (error) {
    console.error("创建投资方向失败:", error);
    return NextResponse.json({ error: "创建投资方向失败" }, { status: 500 });
  }
}
