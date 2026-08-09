import assert from "node:assert/strict";
import test from "node:test";
import prismaModule from "@/lib/prisma";
import { PUT } from "@/app/api/funds/[id]/route";
import { updateInvestmentDirectionActualAmount } from "@/lib/investment-direction";

const prisma = (prismaModule as typeof prismaModule & { default?: typeof prismaModule }).default ?? prismaModule;
type MockableDelegate = {
  findUnique: (...args: unknown[]) => unknown;
  update: (...args: unknown[]) => unknown;
};

test("recalculates both directions after moving a fund", async (t) => {
  const recalculated: number[] = [];
  const fundDelegate = prisma.fund as unknown as MockableDelegate;
  const directionDelegate = prisma.investmentDirection as unknown as MockableDelegate;
  const fundFindUnique = fundDelegate.findUnique;
  const fundUpdate = fundDelegate.update;
  const directionFindUnique = directionDelegate.findUnique;
  const directionUpdate = directionDelegate.update;

  fundDelegate.findUnique = async () => ({ directionId: 3 });
  fundDelegate.update = async () => ({ id: 7, directionId: 1 });
  directionDelegate.findUnique = async (...args) => {
    const [{ where }] = args as [{ where: { id: number } }];
    recalculated.push(where.id);
    return { id: where.id, funds: [] };
  };
  directionDelegate.update = async () => ({});
  t.after(() => {
    fundDelegate.findUnique = fundFindUnique;
    fundDelegate.update = fundUpdate;
    directionDelegate.findUnique = directionFindUnique;
    directionDelegate.update = directionUpdate;
  });

  const response = await PUT(
    new Request("http://localhost/api/funds/7", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ directionId: 1 }),
    }),
    { params: Promise.resolve({ id: "7" }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(recalculated.sort(), [1, 3]);
});

test("closed profitable positions have zero actual amount", async (t) => {
  const directionDelegate = prisma.investmentDirection as unknown as MockableDelegate;
  const directionFindUnique = directionDelegate.findUnique;
  const directionUpdate = directionDelegate.update;
  let actualAmount = "";

  directionDelegate.findUnique = async () => ({
    id: 3,
    funds: [{
      transactions: [
        { type: "BUY", amount: "100", shares: "10", dividendReinvest: false },
        { type: "SELL", amount: "120", shares: "-10", dividendReinvest: false },
      ],
    }],
  });
  directionDelegate.update = async (...args) => {
    const [{ data }] = args as [{ data: { actualAmount: { toString(): string } } }];
    actualAmount = data.actualAmount.toString();
    return {};
  };
  t.after(() => {
    directionDelegate.findUnique = directionFindUnique;
    directionDelegate.update = directionUpdate;
  });

  await updateInvestmentDirectionActualAmount(3);

  assert.equal(actualAmount, "0");
});
