ALTER TABLE `CategoryTarget`
  ADD COLUMN `minPercent` DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN `maxPercent` DECIMAL(5,2) NOT NULL DEFAULT 100;

ALTER TABLE `PortfolioStrategyAnalysis`
  ADD COLUMN `userId` INTEGER NULL,
  ADD INDEX `PortfolioStrategyAnalysis_userId_createdAt_idx` (`userId`),
  ADD CONSTRAINT `PortfolioStrategyAnalysis_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- The current production account has a single user. Preserve existing
-- single-user records while leaving multi-user databases untouched.
UPDATE `InvestmentDirection`
SET `userId` = (SELECT `id` FROM `User` LIMIT 1)
WHERE `userId` IS NULL
  AND (SELECT COUNT(*) FROM `User`) = 1;

UPDATE `PortfolioStrategyAnalysis`
SET `userId` = (SELECT `id` FROM `User` LIMIT 1)
WHERE `userId` IS NULL
  AND (SELECT COUNT(*) FROM `User`) = 1;
