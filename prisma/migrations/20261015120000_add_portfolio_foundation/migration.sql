CREATE TABLE `HouseholdAssetPolicy` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `annualReturnTarget` DECIMAL(5,2) NOT NULL DEFAULT 5,
  `emergencyCashAmount` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `rebalanceBandPercent` DECIMAL(5,2) NOT NULL DEFAULT 5,
  `targetAllocationJson` TEXT NOT NULL,
  `reviewFrequency` VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `HouseholdAssetPolicy_userId_key`(`userId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `HouseholdAssetPolicy_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StrategyAccount` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `householdAssetId` INTEGER NULL,
  `name` VARCHAR(191) NOT NULL,
  `managerName` VARCHAR(191) NULL,
  `strategyName` VARCHAR(191) NULL,
  `platform` VARCHAR(191) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL DEFAULT 'SCREENSHOT',
  `asOfDate` DATETIME(3) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `StrategyAccount_householdAssetId_key`(`householdAssetId`),
  INDEX `StrategyAccount_userId_idx`(`userId`),
  INDEX `StrategyAccount_platform_idx`(`platform`),
  PRIMARY KEY (`id`),
  CONSTRAINT `StrategyAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StrategyAccount_householdAssetId_fkey` FOREIGN KEY (`householdAssetId`) REFERENCES `HouseholdAsset`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StrategyAccountImport` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `strategyAccountId` INTEGER NOT NULL,
  `asOfDate` DATETIME(3) NOT NULL,
  `sourceType` VARCHAR(191) NOT NULL DEFAULT 'SCREENSHOT_AI',
  `sourceFileNames` TEXT NULL,
  `rawJson` LONGTEXT NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'CONFIRMED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `StrategyAccountImport_strategyAccountId_asOfDate_idx`(`strategyAccountId`, `asOfDate`),
  PRIMARY KEY (`id`),
  CONSTRAINT `StrategyAccountImport_strategyAccountId_fkey` FOREIGN KEY (`strategyAccountId`) REFERENCES `StrategyAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `StrategyAccountHolding` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `strategyAccountId` INTEGER NOT NULL,
  `importId` INTEGER NULL,
  `asOfDate` DATETIME(3) NOT NULL,
  `fundCode` VARCHAR(191) NULL,
  `fundName` VARCHAR(191) NOT NULL,
  `assetClass` VARCHAR(191) NULL,
  `marketValue` DECIMAL(15,2) NOT NULL,
  `weight` DECIMAL(7,4) NULL,
  `confidence` DECIMAL(5,2) NULL,
  `note` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `StrategyAccountHolding_strategyAccountId_asOfDate_idx`(`strategyAccountId`, `asOfDate`),
  INDEX `StrategyAccountHolding_fundCode_idx`(`fundCode`),
  PRIMARY KEY (`id`),
  CONSTRAINT `StrategyAccountHolding_strategyAccountId_fkey` FOREIGN KEY (`strategyAccountId`) REFERENCES `StrategyAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `StrategyAccountHolding_importId_fkey` FOREIGN KEY (`importId`) REFERENCES `StrategyAccountImport`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
