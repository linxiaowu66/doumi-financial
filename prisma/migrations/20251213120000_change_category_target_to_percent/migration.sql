-- Step 1: Add new column for percentage
ALTER TABLE `CategoryTarget` 
  ADD COLUMN `targetPercent` DECIMAL(5, 2) NULL COMMENT '目标仓位百分比（0-100）';

-- Step 2: Convert existing targetAmount to percentage based on InvestmentDirection.expectedAmount
UPDATE `CategoryTarget` ct
JOIN `InvestmentDirection` id ON ct.directionId = id.id
SET ct.targetPercent = CASE 
  WHEN id.expectedAmount > 0 THEN (ct.targetAmount / id.expectedAmount * 100)
  ELSE 0
END;

-- Step 3: Set default value for NULL percentages (if any)
UPDATE `CategoryTarget` 
SET `targetPercent` = 0 
WHERE `targetPercent` IS NULL;

-- Step 4: Make targetPercent NOT NULL
ALTER TABLE `CategoryTarget` 
  MODIFY COLUMN `targetPercent` DECIMAL(5, 2) NOT NULL COMMENT '目标仓位百分比（0-100）';

-- Step 5: Drop old targetAmount column
ALTER TABLE `CategoryTarget` 
  DROP COLUMN `targetAmount`;

