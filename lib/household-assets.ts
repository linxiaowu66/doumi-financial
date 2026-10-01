export function isHouseholdAssetUpdateDue(
  asOfDates: Array<string | Date>,
  now = new Date(),
): boolean {
  if (asOfDates.length === 0) return false;

  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() < lastDay - 4) return false;

  return asOfDates.some((value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      || date.getFullYear() !== now.getFullYear()
      || date.getMonth() !== now.getMonth();
  });
}

export interface HouseholdHistorySnapshot {
  sourceId: number;
  category?: string;
  value: number | string;
  date: string | Date;
  month?: string;
}

const HOUSEHOLD_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function isHouseholdMonth(value: string): boolean {
  return HOUSEHOLD_MONTH_PATTERN.test(value);
}

export function shiftHouseholdMonth(month: string, delta: number): string {
  const match = HOUSEHOLD_MONTH_PATTERN.exec(month);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthToAsOfDate(month: string): Date {
  const match = HOUSEHOLD_MONTH_PATTERN.exec(month);
  if (!match) throw new Error("无效月份");
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15, 12, 0, 0));
}

export function currentHouseholdMonth(now = new Date()): string {
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return `${shanghai.getUTCFullYear()}-${String(shanghai.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Leftover fund shares after a liquidation can still add up to a few cents. */
export const HOUSEHOLD_DIRECTION_VISIBLE_MIN = 1;

export function showsHouseholdDirection(currentValue: number, latestSnapshotValue: number | null): boolean {
  if (currentValue >= HOUSEHOLD_DIRECTION_VISIBLE_MIN) return true;
  return latestSnapshotValue !== null && latestSnapshotValue >= HOUSEHOLD_DIRECTION_VISIBLE_MIN;
}

export function keepsHouseholdDirectionHistory(currentValue: number, snapshotValues: number[]): boolean {
  if (currentValue >= HOUSEHOLD_DIRECTION_VISIBLE_MIN) return true;
  return snapshotValues.some((value) => value >= HOUSEHOLD_DIRECTION_VISIBLE_MIN);
}

export function tracksHouseholdDirection(
  currentValue: number,
  snapshots: Array<{ month: string; value: number | string }>,
): boolean {
  const ordered = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
  const values = ordered.map((snapshot) => Number(snapshot.value));
  const latest = values.length ? values[values.length - 1] : null;
  return showsHouseholdDirection(currentValue, latest) || keepsHouseholdDirectionHistory(currentValue, values);
}

export function formatWanAxis(value: number): string {
  if (!Number.isFinite(value)) return "";
  const sign = value < 0 ? "-" : "";
  const amount = Math.abs(value);
  if (amount < 10000) return `${sign}${Math.round(amount).toLocaleString("zh-CN")}`;
  const wan = Math.round((amount / 10000) * 10) / 10;
  const text = Number.isInteger(wan) ? String(wan) : wan.toFixed(1);
  return `${sign}${text}w`;
}

export function monthAxisAnchor(index: number, count: number): "start" | "middle" | "end" {
  if (count <= 1) return "middle";
  if (index <= 0) return "start";
  return index >= count - 1 ? "end" : "middle";
}

export function suggestSnapshotMonth(
  netWorthDates: Array<string | null | undefined>,
  now = new Date(),
): string {
  let latest = "";
  for (const value of netWorthDates) {
    const month = value?.slice(0, 7) ?? "";
    if (isHouseholdMonth(month) && month > latest) latest = month;
  }
  if (latest) return latest;

  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const current = currentHouseholdMonth(now);
  return shanghai.getUTCDate() <= 7 ? shiftHouseholdMonth(current, -1) : current;
}

export interface HouseholdHistoryPoint {
  month: string;
  total: number;
  manual: number;
  directions: number;
  QIEMAN: number;
  YUEBAO: number;
  HUATAI: number;
  PERSONAL_PENSION: number;
  OTHER: number;
}

export function nextAnnualPolicyPeriod(
  maturityDate: string | Date | null,
  now = new Date(),
): { startDate: Date; maturityDate: Date } {
  const previousEnd = maturityDate ? new Date(maturityDate) : null;
  const startDate = previousEnd && !Number.isNaN(previousEnd.getTime())
    ? new Date(previousEnd)
    : new Date(now);
  startDate.setHours(0, 0, 0, 0);
  if (previousEnd && !Number.isNaN(previousEnd.getTime())) startDate.setDate(startDate.getDate() + 1);

  const nextMaturityDate = new Date(startDate);
  nextMaturityDate.setFullYear(nextMaturityDate.getFullYear() + 1);
  nextMaturityDate.setDate(nextMaturityDate.getDate() - 1);
  return { startDate, maturityDate: nextMaturityDate };
}

export function previousAnnualPolicyPeriod(
  startDate: string | Date,
  maturityDate: string | Date,
): { startDate: Date; maturityDate: Date } {
  const previousStartDate = new Date(startDate);
  const previousMaturityDate = new Date(maturityDate);
  previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
  previousMaturityDate.setFullYear(previousMaturityDate.getFullYear() - 1);
  return { startDate: previousStartDate, maturityDate: previousMaturityDate };
}

interface InsurancePremiumPolicy {
  annualPremium: number | string;
  startDate?: string | Date | null;
  maturityDate?: string | Date | null;
  premiumPayments: Array<{ year: number; amount: number | string }>;
}

export function insurancePremiumsByYear(
  mode: "ANNUAL" | "LONG_TERM",
  policies: InsurancePremiumPolicy[],
  now = new Date(),
): Array<{ year: number; amount: number }> {
  const totals = new Map<number, number>();
  const add = (year: number, amount: number) => totals.set(year, (totals.get(year) || 0) + amount);
  if (mode === "ANNUAL") {
    for (const policy of policies) {
      const start = policy.startDate ? new Date(policy.startDate) : null;
      add(start && !Number.isNaN(start.getTime()) ? start.getFullYear() : now.getFullYear(), Number(policy.annualPremium));
    }
    return [...totals].map(([year, amount]) => ({ year, amount })).sort((a, b) => a.year - b.year);
  }

  for (const policy of policies) {
    const payments = new Map(policy.premiumPayments.map((payment) => [payment.year, Number(payment.amount)]));
    const payableYears = new Set(payments.keys());
    const start = policy.startDate ? new Date(policy.startDate) : null;
    const maturity = policy.maturityDate ? new Date(policy.maturityDate) : null;
    const cutoff = maturity && !Number.isNaN(maturity.getTime()) && maturity < now ? maturity : now;
    if (start && !Number.isNaN(start.getTime())) {
      for (const due = new Date(start); due <= cutoff; due.setFullYear(due.getFullYear() + 1)) payableYears.add(due.getFullYear());
    }
    for (const year of payableYears) add(year, payments.get(year) ?? Number(policy.annualPremium));
  }
  return [...totals].map(([year, amount]) => ({ year, amount })).sort((a, b) => a.year - b.year);
}

export function cumulativeInsurancePremium(
  mode: "ANNUAL" | "LONG_TERM",
  policies: InsurancePremiumPolicy[],
  now = new Date(),
): number {
  return insurancePremiumsByYear(mode, policies, now).reduce((total, item) => total + item.amount, 0);
}

export function isAnnualPolicyRenewalDue(
  maturityDate: string | Date | null,
  now = new Date(),
): boolean {
  if (!maturityDate) return true;
  const end = new Date(maturityDate);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end.getTime() - today.getTime() <= 30 * 24 * 60 * 60 * 1000;
}

export function hasAnnualPolicyGap(
  periods: Array<{ startDate: string | Date | null; maturityDate: string | Date | null }>,
  allowedGapDays = 0,
  now?: Date,
): boolean {
  const today = now ? new Date(now) : null;
  today?.setHours(0, 0, 0, 0);
  const datedPeriods = periods
    .map((period) => ({
      start: period.startDate ? new Date(period.startDate) : null,
      end: period.maturityDate ? new Date(period.maturityDate) : null,
    }))
    .filter((period): period is { start: Date; end: Date } => Boolean(
      period.start && period.end && !Number.isNaN(period.start.getTime()) && !Number.isNaN(period.end.getTime()),
    ))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return datedPeriods.some((period, index) => {
    if (!index || (today && period.start.getTime() <= today.getTime())) return false;
    const expectedStart = new Date(datedPeriods[index - 1].end);
    expectedStart.setDate(expectedStart.getDate() + 1 + allowedGapDays);
    return period.start.getTime() > expectedStart.getTime();
  });
}

const HISTORY_CATEGORIES = ["QIEMAN", "YUEBAO", "HUATAI", "PERSONAL_PENSION", "OTHER"] as const;

function monthKey(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function snapshotMonth(snapshot: HouseholdHistorySnapshot): string {
  return snapshot.month && isHouseholdMonth(snapshot.month) ? snapshot.month : monthKey(snapshot.date);
}

function prepareHistory(snapshots: HouseholdHistorySnapshot[]) {
  return snapshots
    .map((snapshot) => ({ ...snapshot, month: snapshotMonth(snapshot) }))
    .filter((snapshot) => snapshot.month)
    .sort((a, b) => a.month.localeCompare(b.month) || new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function buildMonthlyHouseholdHistory(
  manualSnapshots: HouseholdHistorySnapshot[],
  directionSnapshots: HouseholdHistorySnapshot[],
): HouseholdHistoryPoint[] {
  const manual = prepareHistory(manualSnapshots);
  const directions = prepareHistory(directionSnapshots);
  const eventMonths = [...manual, ...directions].map((snapshot) => snapshot.month).sort();
  if (!eventMonths.length) return [];

  const months: string[] = [];
  const cursor = new Date(`${eventMonths[0]}-01T00:00:00`);
  const last = new Date(`${eventMonths[eventMonths.length - 1]}-01T00:00:00`);
  while (cursor <= last) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const manualState = new Map<number, { category: string; value: number }>();
  const directionState = new Map<number, number>();
  let manualIndex = 0;
  let directionIndex = 0;

  return months.map((month) => {
    while (manualIndex < manual.length && manual[manualIndex].month <= month) {
      const snapshot = manual[manualIndex++];
      manualState.set(snapshot.sourceId, {
        category: HISTORY_CATEGORIES.includes(snapshot.category as typeof HISTORY_CATEGORIES[number]) ? snapshot.category! : "OTHER",
        value: Number(snapshot.value),
      });
    }
    while (directionIndex < directions.length && directions[directionIndex].month <= month) {
      const snapshot = directions[directionIndex++];
      directionState.set(snapshot.sourceId, Number(snapshot.value));
    }

    const categories = Object.fromEntries(HISTORY_CATEGORIES.map((category) => [category, 0])) as Record<typeof HISTORY_CATEGORIES[number], number>;
    for (const snapshot of manualState.values()) categories[snapshot.category as typeof HISTORY_CATEGORIES[number]] += snapshot.value;
    const manualTotal = Object.values(categories).reduce((sum, value) => sum + value, 0);
    const directionTotal = [...directionState.values()].reduce((sum, value) => sum + value, 0);

    return {
      month,
      total: manualTotal + directionTotal,
      manual: manualTotal,
      directions: directionTotal,
      ...categories,
    };
  });
}
