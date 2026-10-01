-- AlterTable
ALTER TABLE `HouseholdAssetHistory` ADD COLUMN `month` VARCHAR(7) NULL;

-- Backfill the China-calendar month that the page already displayed.
UPDATE `HouseholdAssetHistory`
SET `month` = DATE_FORMAT(DATE_ADD(`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
WHERE `month` IS NULL;

-- Keep the latest balance when several edits fell in the same month.
DELETE `older` FROM `HouseholdAssetHistory` `older`
INNER JOIN `HouseholdAssetHistory` `newer`
  ON `older`.`assetId` = `newer`.`assetId`
 AND `older`.`month` = `newer`.`month`
 AND (
   `older`.`createdAt` < `newer`.`createdAt`
   OR (`older`.`createdAt` = `newer`.`createdAt` AND `older`.`id` < `newer`.`id`)
 );

ALTER TABLE `HouseholdAssetHistory` MODIFY `month` VARCHAR(7) NOT NULL;

CREATE UNIQUE INDEX `HouseholdAssetHistory_assetId_month_key` ON `HouseholdAssetHistory`(`assetId`, `month`);

-- The account balance shown on the card follows the latest saved month.
UPDATE `HouseholdAsset` `asset`
INNER JOIN `HouseholdAssetHistory` `history` ON `history`.`assetId` = `asset`.`id`
INNER JOIN (
  SELECT `assetId`, MAX(`month`) AS `month`
  FROM `HouseholdAssetHistory`
  GROUP BY `assetId`
) `latest` ON `latest`.`assetId` = `history`.`assetId` AND `latest`.`month` = `history`.`month`
SET `asset`.`balance` = `history`.`balance`,
    `asset`.`asOfDate` = `history`.`asOfDate`;

-- Direction snapshots saved on China calendar day 1 used the click date as the month.
-- Those values are the previous month's last trading-day total, so move them back one month.
-- A mid-month row occupying the target month is replaced by the later month-end sync.
DELETE `older` FROM `HouseholdDirectionSnapshot` `older`
INNER JOIN `HouseholdDirectionSnapshot` `early`
  ON `older`.`directionId` = `early`.`directionId`
 AND `older`.`month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
WHERE DAY(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR)) = 1
  AND `early`.`month` = DATE_FORMAT(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
  AND NOT (
    DAY(DATE_ADD(`older`.`asOfDate`, INTERVAL 8 HOUR)) = 1
    AND `older`.`month` = DATE_FORMAT(DATE_ADD(`older`.`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
  )
  AND `older`.`asOfDate` < `early`.`asOfDate`;

-- Repeat so a September row can leave 2026-09 before an October row moves into it.
UPDATE `HouseholdDirectionSnapshot` AS `early`
SET `month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
WHERE DAY(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR)) = 1
  AND `early`.`month` = DATE_FORMAT(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`
    ) AS `occupant`
    WHERE `occupant`.`directionId` = `early`.`directionId`
      AND `occupant`.`month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
  );

UPDATE `HouseholdDirectionSnapshot` AS `early`
SET `month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
WHERE DAY(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR)) = 1
  AND `early`.`month` = DATE_FORMAT(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`
    ) AS `occupant`
    WHERE `occupant`.`directionId` = `early`.`directionId`
      AND `occupant`.`month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
  );

UPDATE `HouseholdDirectionSnapshot` AS `early`
SET `month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
WHERE DAY(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR)) = 1
  AND `early`.`month` = DATE_FORMAT(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), '%Y-%m')
  AND NOT EXISTS (
    SELECT 1 FROM (
      SELECT `directionId`, `month` FROM `HouseholdDirectionSnapshot`
    ) AS `occupant`
    WHERE `occupant`.`directionId` = `early`.`directionId`
      AND `occupant`.`month` = DATE_FORMAT(DATE_SUB(DATE_ADD(`early`.`asOfDate`, INTERVAL 8 HOUR), INTERVAL 1 MONTH), '%Y-%m')
  );
