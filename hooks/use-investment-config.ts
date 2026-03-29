import { useMemo } from 'react';
import { getInvestmentConfig, InvestmentTypeConfig } from '@/lib/investment-type-config';

export function useInvestmentConfig(type?: string): InvestmentTypeConfig & { isStock: boolean } {
  return useMemo(() => {
    const config = getInvestmentConfig(type);
    return {
      ...config,
      isStock: config.type === 'STOCK',
    };
  }, [type]);
}
