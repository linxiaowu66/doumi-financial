import { Transaction } from "@/types/fund";

export interface ExtendedTransaction extends Transaction {
  fundId: number;
  fundName: string;
  fundCode: string;
}

export interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
  latestNetWorth?: number | null;
  netWorthDate?: string | null;
  createdAt: string;
  confirmDays?: number;
  defaultBuyFee?: number;
  defaultSellFee?: number;
  transactions?: Transaction[];
  _count?: {
    transactions: number;
    plannedPurchases: number;
    pendingTransactions: number;
  };
}

export interface FundAlert {
  fundId: number;
  fundName: string;
  reason: "days" | "price" | "position"; // days: 超过30天, price: 下跌超过5%, position: 仓位超标
  daysSinceLastBuy?: number;
  priceDropPercent?: number;
  positionExcessPercent?: number; // 仓位超标百分比
}

export interface CategoryPositionAlert {
  categoryName: string;
  currentValue: number; // 当前市值（持仓成本 + 持仓收益）
  targetAmount: number; // 目标金额
  excessPercent: number; // 超标百分比
}

export interface InvestmentDirection {
  id: number;
  name: string;
  expectedAmount: number;
  actualAmount: number;
}

export interface FundStats {
  fundId: number;
  holdingShares: number;
  holdingCost: number;
  avgCostPrice: number;
  holdingValue?: number; // 持仓市值
  holdingProfit?: number; // 持仓收益
  holdingProfitRate: number; // 持仓收益率
  totalProfitRate: number; // 累计收益率
  totalProfit: number; // 累计收益金额
  totalDividend: number;
  transactionCount: number;
}

export interface CategoryTarget {
  id: number;
  directionId: number;
  categoryName: string;
  targetPercent: number; // 目标仓位百分比（0-100）
}

export interface DirectionSummary {
  totalInvested: string;
  totalCurrentValue: string;
  totalCost: string;
  holdingProfit: string;
  totalSellProfit: string;
  totalDividendCash: string;
  totalDividendReinvest: string;
  totalProfit: string;
  totalProfitRate: string;
  fundCount: number;
}
