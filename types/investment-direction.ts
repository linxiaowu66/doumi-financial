export interface InvestmentDirection {
  id: number;
  name: string;
  expectedAmount: number;
  actualAmount: number;
  createdAt: string;
  updatedAt: string;
  pendingCount?: number;
  _count?: {
    funds: number;
  };
  latestTransaction?: {
    date: string;
    type: string;
    fundName: string;
  } | null;
}

export interface FundAlert {
  fundId: number;
  fundCode: string;
  fundName: string;
  directionId: number;
  directionName: string;
  category: string | null;
  alertType: 'price_drop' | 'price_rise' | 'category_overdue' | 'category_overweight' | 'pending_transaction';
  alertReason: string;
  latestBuyPrice?: number;
  currentPrice?: number;
  priceChangePercent?: number;
  daysSinceLastBuy?: number;
  categoryHoldingCost?: number;
  categoryTargetAmount?: number;
  overweightPercent?: number;
}
