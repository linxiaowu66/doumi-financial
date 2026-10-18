UPDATE `StrategyAccountHolding`
SET `assetClass` = 'CASH_FLOW'
WHERE `assetClass` = 'OTHER'
  AND (
    `fundName` LIKE '%盈米宝%'
    OR `note` LIKE '%货币基金%'
    OR `note` LIKE '%现金管理%'
  );
