import "dotenv/config";
import assert from "node:assert/strict";
import dayjs from "dayjs";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaClient } from "../app/generated/prisma/client";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.directionDailyProfit.findMany({
    orderBy: [{ directionId: "asc" }, { date: "asc" }],
  });
  const previousByDirection = new Map<number, (typeof rows)[number]>();
  let checkedGaps = 0;

  for (const row of rows) {
    const previous = previousByDirection.get(row.directionId);
    if (previous && dayjs(row.date).diff(previous.date, "day") > 1) {
      const expected = new Decimal(row.cumulativeProfit.toString()).minus(
        previous.cumulativeProfit,
      );
      assert(
        new Decimal(row.dailyProfit.toString()).minus(expected).abs().lessThanOrEqualTo("0.01"),
        `投资方向 ${row.directionId} 在 ${dayjs(row.date).format("YYYY-MM-DD")} 的日盈亏不连续`,
      );
      checkedGaps++;
    }
    previousByDirection.set(row.directionId, row);
  }

  assert(checkedGaps > 0, "没有找到跨非交易日的快照，检查未覆盖目标场景");
  console.log(`已验证 ${checkedGaps} 条跨非交易日快照`);
  await prisma.$disconnect();
}

void main();
