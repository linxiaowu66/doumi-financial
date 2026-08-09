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

const HISTORY_CATEGORIES = ["QIEMAN", "YUEBAO", "HUATAI", "PERSONAL_PENSION", "OTHER"] as const;

function monthKey(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildMonthlyHouseholdHistory(
  manualSnapshots: HouseholdHistorySnapshot[],
  directionSnapshots: HouseholdHistorySnapshot[],
): HouseholdHistoryPoint[] {
  const manual = manualSnapshots.filter((snapshot) => monthKey(snapshot.date)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const directions = directionSnapshots.filter((snapshot) => monthKey(snapshot.date)).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const eventMonths = [...manual, ...directions].map((snapshot) => monthKey(snapshot.date)).sort();
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
    while (manualIndex < manual.length && monthKey(manual[manualIndex].date) <= month) {
      const snapshot = manual[manualIndex++];
      manualState.set(snapshot.sourceId, {
        category: HISTORY_CATEGORIES.includes(snapshot.category as typeof HISTORY_CATEGORIES[number]) ? snapshot.category! : "OTHER",
        value: Number(snapshot.value),
      });
    }
    while (directionIndex < directions.length && monthKey(directions[directionIndex].date) <= month) {
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
