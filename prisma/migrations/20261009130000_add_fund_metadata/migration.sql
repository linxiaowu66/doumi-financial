ALTER TABLE `Fund`
  ADD COLUMN `actualCategory` VARCHAR(191) NULL,
  ADD COLUMN `actualCategorySource` VARCHAR(191) NULL,
  ADD COLUMN `metadataAsOf` VARCHAR(191) NULL,
  ADD COLUMN `metadataFetchedAt` DATETIME(3) NULL,
  ADD COLUMN `metadataJson` LONGTEXT NULL;
