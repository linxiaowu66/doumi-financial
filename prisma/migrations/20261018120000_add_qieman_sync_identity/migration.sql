ALTER TABLE `StrategyAccount`
  ADD COLUMN `qiemanUserPropertyId` VARCHAR(64) NULL,
  ADD INDEX `StrategyAccount_platform_qiemanUserPropertyId_idx` (`platform`, `qiemanUserPropertyId`);

-- Existing deployments keep their configured account identity in the database.
-- No personal account identifiers are embedded in the public migration.
