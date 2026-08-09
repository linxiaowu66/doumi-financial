-- AlterTable
ALTER TABLE `InvestmentDirection` ADD COLUMN `householdMemberId` INTEGER NULL;

-- CreateTable
CREATE TABLE `HouseholdAssetHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `assetId` INTEGER NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL,
    `asOfDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HouseholdAssetHistory_assetId_idx`(`assetId`),
    INDEX `HouseholdAssetHistory_asOfDate_idx`(`asOfDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseholdDirectionSnapshot` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `month` VARCHAR(7) NOT NULL,
    `value` DECIMAL(15, 2) NOT NULL,
    `asOfDate` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `HouseholdDirectionSnapshot_directionId_month_key`(`directionId`, `month`),
    INDEX `HouseholdDirectionSnapshot_directionId_idx`(`directionId`),
    INDEX `HouseholdDirectionSnapshot_asOfDate_idx`(`asOfDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- BackfillHistory
INSERT INTO `HouseholdAssetHistory` (`assetId`, `balance`, `asOfDate`)
SELECT `id`, `balance`, `asOfDate` FROM `HouseholdAsset`;

-- CreateIndex
CREATE INDEX `InvestmentDirection_householdMemberId_idx` ON `InvestmentDirection`(`householdMemberId`);

-- AddForeignKey
ALTER TABLE `InvestmentDirection` ADD CONSTRAINT `InvestmentDirection_householdMemberId_fkey` FOREIGN KEY (`householdMemberId`) REFERENCES `HouseholdMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdAssetHistory` ADD CONSTRAINT `HouseholdAssetHistory_assetId_fkey` FOREIGN KEY (`assetId`) REFERENCES `HouseholdAsset`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdDirectionSnapshot` ADD CONSTRAINT `HouseholdDirectionSnapshot_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
