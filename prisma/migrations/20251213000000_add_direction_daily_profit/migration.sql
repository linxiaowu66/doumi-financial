-- CreateTable
CREATE TABLE `DirectionDailyProfit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `dailyProfit` DECIMAL(15, 2) NOT NULL,
    `cumulativeProfit` DECIMAL(15, 2) NOT NULL,
    `cumulativeProfitRate` DECIMAL(10, 4) NOT NULL,
    `totalInvested` DECIMAL(15, 2) NOT NULL,
    `currentValue` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DirectionDailyProfit_directionId_date_key`(`directionId`, `date`),
    INDEX `DirectionDailyProfit_directionId_idx`(`directionId`),
    INDEX `DirectionDailyProfit_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `DirectionDailyProfit` ADD CONSTRAINT `DirectionDailyProfit_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
