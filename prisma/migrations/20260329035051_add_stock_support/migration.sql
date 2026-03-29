-- AlterTable
ALTER TABLE `InvestmentDirection` ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'FUND';

-- CreateTable
CREATE TABLE `InvestmentDirectionAnalysis` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InvestmentDirectionAnalysis_directionId_idx`(`directionId`),
    INDEX `InvestmentDirectionAnalysis_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnualProfitTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `targetAmount` DECIMAL(15, 2) NOT NULL,
    `actualAmount` DECIMAL(15, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AnnualProfitTarget_year_key`(`year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvestmentDirectionAnalysis` ADD CONSTRAINT `InvestmentDirectionAnalysis_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
