ALTER TABLE `StrategyAccount`
  ADD COLUMN `qiemanUserPropertyIds` TEXT NULL;

-- Existing deployments keep their configured account identities in the database.
-- No personal account identifiers are embedded in the public migration.
