export interface CalculationParams {
  type: 'BUY' | 'SELL' | 'DIVIDEND';
  amount?: number;
  shares?: number;
  price?: number;
  fee?: number;
  code?: string;
  config?: any; // 对于基金可以是 { defaultBuyFee, defaultSellFee }, 对于股票可以是 systemSettings
}

export interface CalculationResult {
  amount: number;
  shares: number;
  fee: number;
  price: number;
}

export interface InvestmentCalculator {
  calculate(params: CalculationParams): CalculationResult;
}

// 基金计算策略
export class FundCalculator implements InvestmentCalculator {
  calculate(params: CalculationParams): CalculationResult {
    const { type, amount = 0, shares = 0, price = 0, fee, config } = params;
    let resAmount = amount;
    let resShares = shares;
    let resFee = fee ?? 0;

    if (type === 'BUY') {
      // 默认买入费率逻辑
      if (fee === undefined && config?.defaultBuyFee) {
        resFee = parseFloat((amount * (parseFloat(config.defaultBuyFee) / 100)).toFixed(2));
      }
      const netAmount = amount - resFee;
      resShares = price > 0 ? netAmount / price : 0;
    } else if (type === 'SELL') {
      if (fee === undefined && config?.defaultSellFee) {
        resFee = parseFloat(((shares * price) * (parseFloat(config.defaultSellFee) / 100)).toFixed(2));
      }
      resAmount = shares * price - resFee;
      resShares = -Math.abs(shares);
    } else if (type === 'DIVIDEND') {
      // 分红逻辑由外部控制更多，这里做简单处理
      resShares = shares;
    }

    return { amount: resAmount, shares: resShares, fee: resFee, price };
  }
}

// 股票计算策略
export class StockCalculator implements InvestmentCalculator {
  private isETF(code: string): boolean {
    return /^(5|1|159|51|58|16)/.test(code);
  }

  calculate(params: CalculationParams): CalculationResult {
    const { type, shares = 0, price = 0, code = '', config } = params;
    const systemSettings = config;
    const calAmount = shares * price;
    
    let resFee = params.fee ?? 0;
    let resAmount = params.amount ?? 0;

    if (type === 'BUY' || type === 'SELL') {
      if (params.fee === undefined) {
        const commRate = parseFloat(systemSettings?.stock_commission_rate || "0.1154") / 1000;
        const fundCommRate = parseFloat(systemSettings?.fund_commission_rate || "0.1") / 1000;
        const transRate = parseFloat(systemSettings?.transfer_fee_rate || "0.01") / 1000;
        const stampRate = parseFloat(systemSettings?.stamp_duty_rate || "0.5") / 1000;
        
        const isETF = this.isETF(code);
        const rate = isETF ? fundCommRate : commRate;

        // 佣金（最小5元规则，A股）
        let commission = parseFloat((calAmount * rate).toFixed(2));
        if (!isETF && commission < 5 && calAmount > 0) {
          commission = 5;
        }

        const transferFee = parseFloat((calAmount * transRate).toFixed(2));
        
        if (type === 'BUY') {
          resFee = commission + transferFee;
          resAmount = calAmount + resFee;
        } else {
          const stampDuty = parseFloat((calAmount * stampRate).toFixed(2));
          resFee = commission + transferFee + stampDuty;
          resAmount = calAmount - resFee;
        }
      } else {
        // 如果手动输入了手续费，重新根据 type 计算总金额
        resFee = params.fee;
        if (type === 'BUY') resAmount = calAmount + resFee;
        else resAmount = calAmount - resFee;
      }
    }

    return {
      amount: parseFloat(resAmount.toFixed(2)),
      shares: type === 'SELL' ? -Math.abs(shares) : shares,
      fee: parseFloat(resFee.toFixed(2)),
      price
    };
  }
}

export const getCalculator = (type: string): InvestmentCalculator => {
  return type === 'STOCK' ? new StockCalculator() : new FundCalculator();
};
