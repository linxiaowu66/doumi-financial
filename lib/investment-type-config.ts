export type InvestmentType = 'FUND' | 'STOCK';

export interface InvestmentTypeConfig {
  type: InvestmentType;
  assetLabel: string;     // 资产类型标签: 基金, 股票
  codeLabel: string;      // 代码标签: 基金代码, 股票代码
  nameLabel: string;      // 名称Label
  priceLabel: string;     // 价格标签: 净值, 股价
  unit: string;           // 单位: 份, 股
  buyLabel: string;       // 买入标签
  sellLabel: string;      // 卖出标签
  allowPending: boolean;  // 是否允许待确认交易 (基金通常允许, 股票通常即时)
  confirmDaysDefault: number; // 默认确认天数
}

export const INVESTMENT_CONFIGS: Record<InvestmentType, InvestmentTypeConfig> = {
  FUND: {
    type: 'FUND',
    assetLabel: '基金',
    codeLabel: '基金代码',
    nameLabel: '基金名称',
    priceLabel: '净值',
    unit: '份',
    buyLabel: '买入',
    sellLabel: '卖出',
    allowPending: true,
    confirmDaysDefault: 1,
  },
  STOCK: {
    type: 'STOCK',
    assetLabel: '股票',
    codeLabel: '股票代码',
    nameLabel: '股票名称',
    priceLabel: '股价',
    unit: '股',
    buyLabel: '买入',
    sellLabel: '卖出',
    allowPending: false,
    confirmDaysDefault: 0,
  },
};

export const getInvestmentConfig = (type?: string): InvestmentTypeConfig => {
  if (type === 'STOCK') return INVESTMENT_CONFIGS.STOCK;
  return INVESTMENT_CONFIGS.FUND;
};
