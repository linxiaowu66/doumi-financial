-- The August launch update is the July snapshot. The end-of-August update is August.
-- The early-October update stays September.

UPDATE `HouseholdAssetHistory`
SET `month` = '2026-07',
    `asOfDate` = '2026-07-15 12:00:00.000'
WHERE `createdAt` >= '2026-08-09 00:00:00.000'
  AND `createdAt` < '2026-08-10 00:00:00.000'
  AND `month` = '2026-08';

UPDATE `HouseholdAssetHistory`
SET `month` = '2026-08',
    `asOfDate` = '2026-08-15 12:00:00.000'
WHERE `createdAt` >= '2026-08-31 22:00:00.000'
  AND `createdAt` < '2026-09-01 00:00:00.000'
  AND `month` = '2026-09';

-- These August balances were removed when two edits were collapsed into one calendar month.
INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `month`, `asOfDate`, `createdAt`)
SELECT `asset`.`id`, 168490.89, '2026-08', '2026-08-15 12:00:00.000', '2026-08-31 22:52:31.935'
FROM `HouseholdAsset` `asset`
WHERE `asset`.`id` = 2 AND `asset`.`name` = '大洋芋的且慢'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `assetId`, `month` FROM `HouseholdAssetHistory`) `existing`
    WHERE `existing`.`assetId` = `asset`.`id` AND `existing`.`month` = '2026-08'
  );

INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `month`, `asOfDate`, `createdAt`)
SELECT `asset`.`id`, 126175.43, '2026-08', '2026-08-15 12:00:00.000', '2026-08-31 22:54:34.773'
FROM `HouseholdAsset` `asset`
WHERE `asset`.`id` = 3 AND `asset`.`name` = '小米喳的且慢'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `assetId`, `month` FROM `HouseholdAssetHistory`) `existing`
    WHERE `existing`.`assetId` = `asset`.`id` AND `existing`.`month` = '2026-08'
  );

INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `month`, `asOfDate`, `createdAt`)
SELECT `asset`.`id`, 70827.06, '2026-08', '2026-08-15 12:00:00.000', '2026-08-31 22:50:47.127'
FROM `HouseholdAsset` `asset`
WHERE `asset`.`id` = 4 AND `asset`.`name` = '小米喳的个人养老金'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `assetId`, `month` FROM `HouseholdAssetHistory`) `existing`
    WHERE `existing`.`assetId` = `asset`.`id` AND `existing`.`month` = '2026-08'
  );

INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `month`, `asOfDate`, `createdAt`)
SELECT `asset`.`id`, 99139.24, '2026-08', '2026-08-15 12:00:00.000', '2026-08-31 22:55:46.142'
FROM `HouseholdAsset` `asset`
WHERE `asset`.`id` = 5 AND `asset`.`name` = '小米喳的余额宝'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `assetId`, `month` FROM `HouseholdAssetHistory`) `existing`
    WHERE `existing`.`assetId` = `asset`.`id` AND `existing`.`month` = '2026-08'
  );

INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `month`, `asOfDate`, `createdAt`)
SELECT `asset`.`id`, 1292.11, '2026-08', '2026-08-15 12:00:00.000', '2026-08-31 23:09:12.963'
FROM `HouseholdAsset` `asset`
WHERE `asset`.`id` = 10 AND `asset`.`name` = '小米喳的零钱通'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `assetId`, `month` FROM `HouseholdAssetHistory`) `existing`
    WHERE `existing`.`assetId` = `asset`.`id` AND `existing`.`month` = '2026-08'
  );

INSERT INTO `HouseholdDirectionSnapshot` (`directionId`, `month`, `value`, `asOfDate`, `createdAt`, `updatedAt`)
SELECT `direction`.`id`, '2026-07', 65358.13, '2026-08-09 14:10:35.741', '2026-08-09 14:10:35.741', CURRENT_TIMESTAMP(3)
FROM `InvestmentDirection` `direction`
WHERE `direction`.`id` = 1 AND `direction`.`name` = '小米喳海外长钱'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`) `existing`
    WHERE `existing`.`directionId` = `direction`.`id` AND `existing`.`month` = '2026-07'
  );

INSERT INTO `HouseholdDirectionSnapshot` (`directionId`, `month`, `value`, `asOfDate`, `createdAt`, `updatedAt`)
SELECT `direction`.`id`, '2026-07', 182803.73, '2026-08-09 14:10:35.741', '2026-08-09 14:10:35.741', CURRENT_TIMESTAMP(3)
FROM `InvestmentDirection` `direction`
WHERE `direction`.`id` = 4 AND `direction`.`name` = '大洋芋的增值投资'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`) `existing`
    WHERE `existing`.`directionId` = `direction`.`id` AND `existing`.`month` = '2026-07'
  );

INSERT INTO `HouseholdDirectionSnapshot` (`directionId`, `month`, `value`, `asOfDate`, `createdAt`, `updatedAt`)
SELECT `direction`.`id`, '2026-07', 171696.08, '2026-08-09 14:10:35.741', '2026-08-09 14:10:35.741', CURRENT_TIMESTAMP(3)
FROM `InvestmentDirection` `direction`
WHERE `direction`.`id` = 5 AND `direction`.`name` = '小米喳的增值投资'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`) `existing`
    WHERE `existing`.`directionId` = `direction`.`id` AND `existing`.`month` = '2026-07'
  );

INSERT INTO `HouseholdDirectionSnapshot` (`directionId`, `month`, `value`, `asOfDate`, `createdAt`, `updatedAt`)
SELECT `direction`.`id`, '2026-07', 304241.46, '2026-08-09 14:10:35.741', '2026-08-09 14:10:35.741', CURRENT_TIMESTAMP(3)
FROM `InvestmentDirection` `direction`
WHERE `direction`.`id` = 9 AND `direction`.`name` = '大洋芋的保本投资'
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`) `existing`
    WHERE `existing`.`directionId` = `direction`.`id` AND `existing`.`month` = '2026-07'
  );

UPDATE `HouseholdAsset` `asset`
INNER JOIN `HouseholdAssetHistory` `history` ON `history`.`assetId` = `asset`.`id`
INNER JOIN (
  SELECT `assetId`, MAX(`month`) AS `month`
  FROM `HouseholdAssetHistory`
  GROUP BY `assetId`
) `latest` ON `latest`.`assetId` = `history`.`assetId` AND `latest`.`month` = `history`.`month`
SET `asset`.`balance` = `history`.`balance`,
    `asset`.`asOfDate` = `history`.`asOfDate`;
