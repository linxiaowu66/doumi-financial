export interface InvestmentDirection {
  id: number;
  name: string;
  type: "FUND" | "STOCK";
  expectedAmount: number;
  actualAmount: number;
  householdMemberId?: number | null;
  householdMember?: { id: number; name: string; relation: string | null } | null;
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
  alertType:
    | "price_drop"
    | "price_rise"
    | "take_profit"
    | "category_overdue"
    | "category_overweight"
    | "pending_transaction";
  alertReason: string;
  latestBuyPrice?: number;
  currentPrice?: number;
  priceChangePercent?: number;
  daysSinceLastBuy?: number;
  categoryHoldingCost?: number;
  categoryTargetAmount?: number;
  overweightPercent?: number;
}
