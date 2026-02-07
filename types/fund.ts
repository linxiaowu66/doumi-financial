export interface PendingTransaction {
  id: number;
  fundId: number;
  type: string;
  applyDate: string;
  applyAmount?: number;
  applyShares?: number;
  status: string;
  createdAt: string;
}

export interface Fund {
  id: number;
  code: string;
  name: string;
  category: string | null;
  remark: string | null;
  latestNetWorth?: number | null;
  netWorthDate?: string | null;
  netWorthUpdateAt?: string | null;
  confirmDays?: number;
  defaultBuyFee?: number;
  defaultSellFee?: number;
  direction: {
    id: number;
    name: string;
  };
  pendingTransactions?: PendingTransaction[];
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  shares: number;
  price: number;
  fee: number;
  date: string;
  dividendReinvest: boolean;
  remark: string | null;
}

export interface FundStats {
  holdingShares: number;
  holdingCost: number;
  avgCostPrice: number;
  holdingValue: number;
  holdingProfit: number;
  holdingProfitRate: number;
  totalDividendCash: number;
  totalDividendReinvest: number;
  totalSellProfit: number;
  totalProfit: number;
  totalProfitRate: number;
  transactionCount: number;
}

export interface PlannedPurchase {
  id: number;
  fundId: number;
  plannedAmount: number;
  status: string;
  createdAt: string;
  purchasedAt: string | null;
}
