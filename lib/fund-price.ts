import dayjs from 'dayjs';

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
  matchType: 'exact' | 'nearest';
  requestedDate?: string; // The original requested date
  message?: string;
}

/**
 * Fetches the net worth of a fund for a specific date.
 * If exact match is not found, it attempts to find the nearest previous trading day within 7 days.
 * 
 * @param code Fund code
 * @param date Target date (YYYY-MM-DD or Date object)
 * @returns FundNetWorthResult or null if not found
 */
export async function getFundNetWorth(code: string, date: string | Date): Promise<FundNetWorthResult | null> {
  try {
    const targetDate = dayjs(date);
    const targetDateStr = targetDate.format('YYYY-MM-DD');
    const today = dayjs();
    const daysDiff = today.diff(targetDate, 'day');

    // Dynamic page size calculation based on date difference
    // Minimum 30 days, maximum 600 days (approx 2 years)
    const pageSize = Math.min(Math.max(daysDiff + 20, 30), 600);

    // East Money API
    const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNHisNetList?FCODE=${code}&pageIndex=1&pageSize=${pageSize}&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=123`;

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      cache: 'no-store',
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
        const itemDateStr = dayjs(dateRaw).format('YYYY-MM-DD');

        if (itemDateStr === targetDateStr) {
          return {
            code: code,
            date: targetDateStr,
            netWorth: parseFloat(navValue),
            matchType: 'exact',
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
        const dateA = a.FSRQ || a.NAVDATE || '';
        const dateB = b.FSRQ || b.NAVDATE || '';
        return dayjs(dateB).valueOf() - dayjs(dateA).valueOf();
      });

    for (const item of sortedData) {
      const dateRaw = item.FSRQ || item.NAVDATE;
      const itemDate = dayjs(dateRaw);

      // If date is before or equal to target date (within 7 days)
      if (
        itemDate.valueOf() <= targetDate.valueOf() &&
        targetDate.diff(itemDate, 'day') <= 7
      ) {
        const navValue = item.NAV || item.DWJZ;
        return {
          code: code,
          date: itemDate.format('YYYY-MM-DD'),
          requestedDate: targetDateStr,
          netWorth: parseFloat(navValue || '0'),
          matchType: 'nearest',
          message: `${targetDateStr} is non-trading day, using nearest ${itemDate.format('YYYY-MM-DD')}`,
        };
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching fund net worth for ${code} on ${date}:`, error);
    return null;
  }
}
