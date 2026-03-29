import dayjs from "dayjs";

interface HistoryDataItem {
  FSRQ?: string;
  NAVDATE?: string;
  NAV?: string;
  DWJZ?: string;
}

export interface FundNetWorthResult {
  code: string;
  date: string; // The found date (YYYY-MM-DD)
  netWorth: number;
  matchType: "exact" | "nearest";
  requestedDate?: string; // The original requested date
  message?: string;
}

export function isStockCode(code: string): {
  isStock: boolean;
  secid?: string;
  stockCode?: string;
  originalCode?: string;
} {
  const match = code.trim().match(/^(sh|sz|bj)(\d{6})$/i);
  if (match) {
    const prefix = match[1].toLowerCase();
    const stockCode = match[2];
    let secid = "1";
    if (prefix === "sh") secid = "1";
    else if (prefix === "sz" || prefix === "bj") secid = "0";
    return { isStock: true, secid, stockCode, originalCode: code };
  }
  return { isStock: false };
}

/**
 * Fetches the net worth of a fund for a specific date.
 * If exact match is not found, it attempts to find the nearest previous trading day within 7 days.
 *
 * @param code Fund code
 * @param date Target date (YYYY-MM-DD or Date object)
 * @returns FundNetWorthResult or null if not found
 */
export async function getFundNetWorth(
  code: string,
  date: string | Date,
): Promise<FundNetWorthResult | null> {
  try {
    const targetDate = dayjs(date);
    const targetDateStr = targetDate.format("YYYY-MM-DD");
    const today = dayjs();
    const daysDiff = today.diff(targetDate, "day");

    // Dynamic page size calculation based on date difference
    // Minimum 30 days, maximum 600 days (approx 2 years)
    const pageSize = Math.min(Math.max(daysDiff + 20, 30), 600);
    const stockCheck = isStockCode(code);

    if (stockCheck.isStock) {
      const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=${stockCheck.secid}.${stockCheck.stockCode}&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=${pageSize}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (!data?.data?.klines) return null;

      const parsedKlines = (data.data.klines as string[]).map((line) => {
        const parts = line.split(",");
        return { date: parts[0], close: parseFloat(parts[2]) };
      });

      // 1. Try exact match
      for (const item of parsedKlines) {
        if (item.date === targetDateStr) {
          return {
            code,
            date: item.date,
            netWorth: item.close,
            matchType: "exact",
          };
        }
      }

      // 2. If no exact match, find nearest previous trading day
      const sortedData = parsedKlines.sort(
        (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf(),
      );
      for (const item of sortedData) {
        const itemDate = dayjs(item.date);
        if (
          itemDate.valueOf() <= targetDate.valueOf() &&
          targetDate.diff(itemDate, "day") <= 7
        ) {
          return {
            code,
            date: item.date,
            requestedDate: targetDateStr,
            netWorth: item.close,
            matchType: "nearest",
            message: `${targetDateStr} is non-trading day, using nearest ${item.date}`,
          };
        }
      }
      return null;
    }

    // East Money API
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList?FCODE=${code}&pageIndex=1&pageSize=${pageSize}&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
      },
      cache: "no-store",
    });

    const data = await res.json();

    if (!data?.Datas || !Array.isArray(data.Datas) || data.Datas.length === 0) {
      console.error(`Fund ${code} history data is empty or invalid.`);
      return null;
    }

    // 1. Try exact match
    for (const item of data.Datas) {
      const dateRaw = item.FSRQ || item.NAVDATE;
      const navValue = item.NAV || item.DWJZ;

      if (navValue && dateRaw) {
        const itemDateStr = dayjs(dateRaw).format("YYYY-MM-DD");

        if (itemDateStr === targetDateStr) {
          return {
            code: code,
            date: targetDateStr,
            netWorth: parseFloat(navValue),
            matchType: "exact",
          };
        }
      }
    }

    // 2. If no exact match, find nearest previous trading day
    const sortedData = (data.Datas as HistoryDataItem[])
      .filter((item) => {
        const dateRaw = item.FSRQ || item.NAVDATE;
        const navValue = item.NAV || item.DWJZ;
        return navValue && dateRaw;
      })
      .sort((a, b) => {
        const dateA = a.FSRQ || a.NAVDATE || "";
        const dateB = b.FSRQ || b.NAVDATE || "";
        return dayjs(dateB).valueOf() - dayjs(dateA).valueOf();
      });

    for (const item of sortedData) {
      const dateRaw = item.FSRQ || item.NAVDATE;
      const itemDate = dayjs(dateRaw);

      // If date is before or equal to target date (within 7 days)
      if (
        itemDate.valueOf() <= targetDate.valueOf() &&
        targetDate.diff(itemDate, "day") <= 7
      ) {
        const navValue = item.NAV || item.DWJZ;
        return {
          code: code,
          date: itemDate.format("YYYY-MM-DD"),
          requestedDate: targetDateStr,
          netWorth: parseFloat(navValue || "0"),
          matchType: "nearest",
          message: `${targetDateStr} is non-trading day, using nearest ${itemDate.format("YYYY-MM-DD")}`,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(
      `Error fetching fund net worth for ${code} on ${date}:`,
      error,
    );
    return null;
  }
}
