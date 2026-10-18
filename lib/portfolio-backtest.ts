type BacktestPoint = { date: string; value: number };

export type PortfolioBacktestFund = {
  id: number;
  name: string;
  targetPercent: number;
  buyFeePercent: number;
  sellFeePercent: number;
  history: BacktestPoint[];
};

export type BacktestMetrics = {
  totalReturn: number;
  annualizedReturn: number;
  annualizedVolatility: number;
  sharpe: number | null;
  maxDrawdown: number;
  trades: number;
  turnover: number;
};

export type BacktestDataGrade = "INSUFFICIENT" | "RESEARCH" | "RECOMMENDED" | "ROBUST";
export type PortfolioBacktestOptions = { feeMultiplier?: number; rebalanceFrequency?: "MONTHLY" | "QUARTERLY" };

export function backtestDataGrade(observations: number): BacktestDataGrade {
  if (observations < 126) return "INSUFFICIENT";
  if (observations < 756) return "RESEARCH";
  if (observations < 1260) return "RECOMMENDED";
  return "ROBUST";
}

function sliceWithWarmup(funds: PortfolioBacktestFund[], dates: string[], start: number, end: number) {
  const warmupStart = Math.max(0, start - 60);
  const windowDates = new Set(dates.slice(warmupStart, end));
  return funds.map((fund) => ({ ...fund, history: fund.history.filter((point) => windowDates.has(point.date)) }));
}

const pct = (value: number) => Number(value.toFixed(2));

function metrics(returns: number[], trades: number, turnover: number): BacktestMetrics {
  let value = 1;
  let high = 1;
  let maxDrawdown = 0;
  for (const change of returns) {
    value *= 1 + change;
    high = Math.max(high, value);
    maxDrawdown = Math.max(maxDrawdown, (high - value) / high);
  }
  const years = returns.length / 252;
  const average = returns.length ? returns.reduce((sum, item) => sum + item, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((sum, item) => sum + (item - average) ** 2, 0) / returns.length : 0;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);
  return {
    totalReturn: pct((value - 1) * 100),
    annualizedReturn: pct(years > 0 ? (value ** (1 / years) - 1) * 100 : 0),
    annualizedVolatility: pct(volatility * 100),
    sharpe: volatility > 0 ? pct(average / Math.sqrt(variance) * Math.sqrt(252)) : null,
    maxDrawdown: pct(maxDrawdown * 100),
    trades,
    turnover: pct(turnover * 100),
  };
}

export function runTrendBacktest(points: BacktestPoint[], buyFeePercent: number, sellFeePercent: number) {
  const history = points.filter((point) => Number.isFinite(point.value) && point.value > 0).sort((a, b) => a.date.localeCompare(b.date));
  if (history.length < 126) return { enoughData: false, observations: history.length };
  const strategyReturns: number[] = [];
  const buyHoldReturns: number[] = [];
  let invested = false;
  let trades = 0;
  let turnover = 0;
  for (let index = 60; index < history.length; index += 1) {
    const decisionIndex = index - 1;
    const ma20 = history.slice(decisionIndex - 19, decisionIndex + 1).reduce((sum, point) => sum + point.value, 0) / 20;
    const ma60 = history.slice(decisionIndex - 59, decisionIndex + 1).reduce((sum, point) => sum + point.value, 0) / 60;
    const nextInvested = history[decisionIndex].value > ma20 && history[decisionIndex].value > ma60;
    const change = history[index].value / history[decisionIndex].value - 1;
    const side = nextInvested !== invested;
    if (side) {
      trades += 1;
      turnover += 1;
    }
    const fee = side ? (nextInvested ? buyFeePercent : sellFeePercent) / 100 : 0;
    strategyReturns.push((nextInvested ? change : 0) - fee);
    buyHoldReturns.push(change);
    invested = nextInvested;
  }
  return {
    enoughData: true,
    observations: history.length,
    strategy: metrics(strategyReturns, trades, turnover),
    buyAndHold: metrics(buyHoldReturns, 0, 1),
    firstDate: history[0].date,
    lastDate: history.at(-1)?.date,
  };
}

function priceAtOrBefore(history: BacktestPoint[], date: string) {
  let result: number | null = null;
  for (const point of history) {
    if (point.date > date) break;
    result = point.value;
  }
  return result;
}

/**
 * 组合级回测：T-1 决策，下一可用净值点成交，每月第一交易日按目标权重再平衡。
 * 目标权重由调用方提供，未满足历史长度的基金只会被跳过，不用未来数据填充。
 */
export function runPortfolioBacktest(funds: PortfolioBacktestFund[], options: PortfolioBacktestOptions = {}) {
  const feeMultiplier = Math.max(0, Number(options.feeMultiplier ?? 1));
  const rebalanceFrequency = options.rebalanceFrequency ?? "MONTHLY";
  const cleanedFunds = funds.map((fund) => ({ ...fund, history: fund.history.filter((point) => Number.isFinite(point.value) && point.value > 0).sort((a, b) => a.date.localeCompare(b.date)) }));
  const usableFunds = cleanedFunds.filter((fund) => fund.history.length >= 126 && fund.targetPercent > 0);
  const dates = [...new Set(usableFunds.flatMap((fund) => fund.history.map((point) => point.date)))].sort();
  const allObservations = new Set(cleanedFunds.flatMap((fund) => fund.history.map((point) => point.date))).size;
  const dataGrade = backtestDataGrade(usableFunds.length === 0 ? allObservations : dates.length);
  if (usableFunds.length === 0 || dates.length < 126) return { enoughData: false, observations: usableFunds.length === 0 ? allObservations : dates.length, funds: usableFunds.length, dataGrade, rebalanceFrequency, feeMultiplier };

  const shares = new Map<number, number>();
  let cash = 1;
  let previousValue = 1;
  let trades = 0;
  let turnover = 0;
  const dailyReturns: number[] = [];
  const firstIndex = 60;
  for (let index = firstIndex; index < dates.length; index += 1) {
    const date = dates[index];
    const previousDate = dates[index - 1];
    const currentPrices = new Map<number, number>();
    for (const fund of usableFunds) {
      const price = priceAtOrBefore(fund.history, date);
      if (price !== null) currentPrices.set(fund.id, price);
    }
    let valueBefore = cash;
    for (const fund of usableFunds) valueBefore += (shares.get(fund.id) || 0) * (currentPrices.get(fund.id) || 0);
    const monthChanged = date.slice(0, 7) !== previousDate.slice(0, 7);
    const quarterChanged = date.slice(0, 7) !== previousDate.slice(0, 7) && Math.floor((Number(date.slice(5, 7)) - 1) / 3) !== Math.floor((Number(previousDate.slice(5, 7)) - 1) / 3);
    const rebalance = index === firstIndex || (rebalanceFrequency === "QUARTERLY" ? quarterChanged : monthChanged);
    if (rebalance && valueBefore > 0) {
      // 先卖出超配仓位，释放现金；再买入低配仓位，避免使用未来价格。
      const desired = new Map(usableFunds.map((fund) => [fund.id, valueBefore * fund.targetPercent / 100]));
      for (const fund of usableFunds) {
        const price = currentPrices.get(fund.id);
        if (!price) continue;
        const current = (shares.get(fund.id) || 0) * price;
        const excess = Math.max(0, current - (desired.get(fund.id) || 0));
        if (excess <= 0) continue;
        shares.set(fund.id, Math.max(0, (shares.get(fund.id) || 0) - excess / price));
        cash += excess * (1 - fund.sellFeePercent * feeMultiplier / 100);
        turnover += excess / valueBefore;
        trades += 1;
      }
      for (const fund of usableFunds) {
        const price = currentPrices.get(fund.id);
        if (!price) continue;
        const current = (shares.get(fund.id) || 0) * price;
        const need = Math.max(0, (desired.get(fund.id) || 0) - current);
        const affordable = Math.min(need, cash / (1 + fund.buyFeePercent * feeMultiplier / 100));
        if (affordable <= 0) continue;
        shares.set(fund.id, (shares.get(fund.id) || 0) + affordable / price);
        cash -= affordable * (1 + fund.buyFeePercent * feeMultiplier / 100);
        turnover += affordable / valueBefore;
        trades += 1;
      }
    }
    let endValue = cash;
    for (const fund of usableFunds) endValue += (shares.get(fund.id) || 0) * (currentPrices.get(fund.id) || 0);
    dailyReturns.push(previousValue > 0 ? endValue / previousValue - 1 : 0);
    previousValue = endValue;
  }
  return {
    enoughData: true,
    observations: dates.length,
    funds: usableFunds.length,
    strategy: metrics(dailyReturns, trades, turnover),
    firstDate: dates[firstIndex],
    lastDate: dates.at(-1),
    rebalanceFrequency,
    feeMultiplier,
    dataGrade,
  };
}

export function runPortfolioBacktestReport(funds: PortfolioBacktestFund[]) {
  const base = runPortfolioBacktest(funds);
  const allDates = [...new Set(funds.flatMap((fund) => fund.history.map((point) => point.date)))].sort();
  const observations = allDates.length;
  const trainEnd = Math.floor(observations * 0.6);
  const validationEnd = Math.floor(observations * 0.8);
  const split = (name: string, start: number, end: number) => {
    const result = runPortfolioBacktest(sliceWithWarmup(funds, allDates, start, end));
    return { name, firstDate: allDates[start] || null, lastDate: allDates[Math.max(start, end - 1)] || null, observations: Math.max(0, end - start), enoughData: result.enoughData, dataGrade: result.dataGrade, strategy: result.strategy || null };
  };
  const walkForward = observations >= 378 ? [split("训练区间", 0, trainEnd), split("验证区间", trainEnd, validationEnd), split("盲测区间", validationEnd, observations)] : [];
  const feeStress = [1, 2, 3].map((multiplier) => {
    const result = runPortfolioBacktest(funds, { feeMultiplier: multiplier });
    return { multiplier, enoughData: result.enoughData, strategy: result.strategy || null };
  });
  const rebalanceSensitivity = (["MONTHLY", "QUARTERLY"] as const).map((frequency) => {
    const result = runPortfolioBacktest(funds, { rebalanceFrequency: frequency });
    return { frequency, enoughData: result.enoughData, strategy: result.strategy || null };
  });
  return { ...base, robustness: { walkForward, feeStress, rebalanceSensitivity, recommendedMinimumObservations: 756, note: "盲测区间至少需要约三年净值；历史不足时只返回检查结果，不补造数据。" } };
}
