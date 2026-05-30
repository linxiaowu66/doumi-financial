// 分类仓位超标判断的统一阈值：超出目标金额 1% 以上才算超标
// （误差范围内的浮动，如定投凑整、手续费舍入，不触发超标提醒）
export const CATEGORY_OVERWEIGHT_THRESHOLD_PERCENT = 1;

/**
 * 计算仓位超标百分比（相对于目标金额的超出比例）
 * 未超标时返回 0
 */
export function categoryOverweightPercent(actual: number, target: number): number {
  if (target <= 0 || actual <= target) return 0;
  return ((actual - target) / target) * 100;
}

/**
 * 判断是否超标（超出比例 > CATEGORY_OVERWEIGHT_THRESHOLD_PERCENT）
 */
export function isCategoryOverweight(actual: number, target: number): boolean {
  return categoryOverweightPercent(actual, target) > CATEGORY_OVERWEIGHT_THRESHOLD_PERCENT;
}
