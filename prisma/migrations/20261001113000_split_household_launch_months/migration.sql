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

-- Historical user-specific backfills are intentionally not embedded in the
-- public migration. Existing deployments retain their data; fresh installs
-- should create history through the application sync flow.

UPDATE `HouseholdAsset` `asset`
INNER JOIN `HouseholdAssetHistory` `history` ON `history`.`assetId` = `asset`.`id`
INNER JOIN (
  SELECT `assetId`, MAX(`month`) AS `month`
  FROM `HouseholdAssetHistory`
  GROUP BY `assetId`
) `latest` ON `latest`.`assetId` = `history`.`assetId` AND `latest`.`month` = `history`.`month`
SET `asset`.`balance` = `history`.`balance`,
    `asset`.`asOfDate` = `history`.`asOfDate`;
