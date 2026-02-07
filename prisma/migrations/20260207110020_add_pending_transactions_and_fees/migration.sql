-- AlterTable
ALTER TABLE `Fund` ADD COLUMN `confirmDays` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `defaultBuyFee` DECIMAL(5, 4) NOT NULL DEFAULT 0.15,
    ADD COLUMN `defaultSellFee` DECIMAL(5, 4) NOT NULL DEFAULT 0.50;

-- CreateTable
CREATE TABLE `PendingTransaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fundId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `applyDate` DATETIME(3) NOT NULL,
    `applyAmount` DECIMAL(15, 2) NULL,
    `applyShares` DECIMAL(15, 4) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'WAITING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PendingTransaction_fundId_idx`(`fundId`),
    INDEX `PendingTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PendingTransaction` ADD CONSTRAINT `PendingTransaction_fundId_fkey` FOREIGN KEY (`fundId`) REFERENCES `Fund`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
