import { Decimal } from "@prisma/client/runtime/library";
import { calcFundSnapshot } from "@/lib/fund-daily-profit";
import prisma from "@/lib/prisma";

type DividendTransaction = {
  type: string;
  amount: { toString(): string } | string | number;
  shares: { toString(): string } | string | number;
  price: { toString(): string } | string | number;
  fee: { toString(): string } | string | number;
  date: Date;
  dividendReinvest: boolean;
};

export type FundDividend = {
  recordDate: string;
  exDate: string;
  perShare: string;
  paymentDate: string;
};

const EASTMONEY_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
};

const stripHtml = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();

export function parseFundDividendPage(html: string): FundDividend[] {
  const table = html.match(/<table[^>]*\bcfxq\b[^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) return [];

  return [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].flatMap(
    ([, row]) => {
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        ([, cell]) => stripHtml(cell),
      );
      if (cells.length < 5) return [];

      const distribution = cells[3].match(
        /每\s*(?:(\d+(?:\.\d+)?)\s*)?份\D*?(\d+(?:\.\d+)?)\s*元/,
      );
      if (!distribution) return [];

      const baseShares = new Decimal(distribution[1] || 1);
      return [{
        recordDate: cells[1],
        exDate: cells[2],
        perShare: new Decimal(distribution[2]).dividedBy(baseShares).toString(),
        paymentDate: cells[4],
      }];
    },
  );
}

function holdingShares(
  transactions: DividendTransaction[],
  throughDate?: string,
): Decimal {
  const cutoff = throughDate
    ? new Date(`${throughDate}T23:59:59.999+08:00`).getTime()
    : Infinity;
  const snapshot = calcFundSnapshot(
    transactions
      .filter((transaction) => transaction.date.getTime() <= cutoff)
      .map((transaction) => ({
        ...transaction,
        amount: new Decimal(transaction.amount.toString()),
        shares: new Decimal(transaction.shares.toString()),
        price: new Decimal(transaction.price.toString()),
        fee: new Decimal(transaction.fee.toString()),
      })),
    null,
  );
  return snapshot.holdingShares;
}

export function calculateDividendAmount(
  transactions: DividendTransaction[],
  recordDate: string,
  perShare: string,
): Decimal {
  return holdingShares(transactions, recordDate)
    .times(perShare)
    .toDecimalPlaces(2);
}

function shanghaiDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export async function detectYesterdayFundDividends(now = new Date()) {
  const paymentDate = shanghaiDate(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const funds = await prisma.fund.findMany({
    where: { direction: { type: "FUND" } },
    select: {
      id: true,
      code: true,
      name: true,
      dividendReinvest: true,
      transactions: { orderBy: { date: "asc" } },
    },
  });
  const openFunds = funds.filter((fund) => holdingShares(fund.transactions).greaterThan(0));
  const pending: Array<{
    fundId: number;
    type: string;
    applyDate: Date;
    applyAmount: Decimal;
    dividendReinvest: boolean;
    dividendRecordDate: Date;
    dividendPerShare: Decimal;
    sourceKey: string;
    remark: string;
  }> = [];
  const errors: string[] = [];

  for (const fund of openFunds) {
    try {
      const response = await fetch(
        `https://fundf10.eastmoney.com/fhsp_${encodeURIComponent(fund.code)}.html`,
        { cache: "no-store", headers: EASTMONEY_HEADERS },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      for (const dividend of parseFundDividendPage(await response.text())) {
        if (dividend.paymentDate !== paymentDate) continue;

        const amount = calculateDividendAmount(
          fund.transactions,
          dividend.recordDate,
          dividend.perShare,
        );
        if (!amount.greaterThan(0)) continue;

        pending.push({
          fundId: fund.id,
          type: "DIVIDEND",
          applyDate: new Date(`${dividend.paymentDate}T00:00:00+08:00`),
          applyAmount: amount,
          dividendReinvest: fund.dividendReinvest,
          dividendRecordDate: new Date(`${dividend.recordDate}T00:00:00+08:00`),
          dividendPerShare: new Decimal(dividend.perShare),
          sourceKey: `eastmoney:${fund.id}:${fund.code}:${dividend.recordDate}:${dividend.paymentDate}:${dividend.perShare}`,
          remark: `自动识别：权益登记日 ${dividend.recordDate}，每份分红 ¥${dividend.perShare}；请以实际到账为准`,
        });
      }
    } catch (error) {
      errors.push(
        `基金 ${fund.code}: ${error instanceof Error ? error.message : "获取失败"}`,
      );
    }
  }

  const result = pending.length
    ? await prisma.pendingTransaction.createMany({ data: pending, skipDuplicates: true })
    : { count: 0 };

  return {
    paymentDate,
    scanned: openFunds.length,
    created: result.count,
    duplicates: pending.length - result.count,
    errors,
  };
}
