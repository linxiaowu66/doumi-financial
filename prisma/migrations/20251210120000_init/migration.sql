-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InvestmentDirection` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `expectedAmount` DECIMAL(15, 2) NOT NULL,
    `actualAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InvestmentDirection_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoryTarget` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `categoryName` VARCHAR(191) NOT NULL,
    `targetAmount` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CategoryTarget_directionId_categoryName_key`(`directionId`, `categoryName`),
    INDEX `CategoryTarget_directionId_idx`(`directionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Fund` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `directionId` INTEGER NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `remark` TEXT NULL,
    `latestNetWorth` DECIMAL(10, 4) NULL,
    `netWorthDate` VARCHAR(191) NULL,
    `netWorthUpdateAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Transaction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fundId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `shares` DECIMAL(15, 4) NOT NULL,
    `price` DECIMAL(10, 4) NOT NULL,
    `fee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `date` DATETIME(3) NOT NULL,
    `dividendReinvest` BOOLEAN NOT NULL DEFAULT false,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Transaction_fundId_idx`(`fundId`),
    INDEX `Transaction_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlannedPurchase` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fundId` INTEGER NOT NULL,
    `plannedAmount` DECIMAL(15, 2) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `purchasedAt` DATETIME(3) NULL,

    INDEX `PlannedPurchase_fundId_idx`(`fundId`),
    INDEX `PlannedPurchase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `InvestmentDirection` ADD CONSTRAINT `InvestmentDirection_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryTarget` ADD CONSTRAINT `CategoryTarget_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Fund` ADD CONSTRAINT `Fund_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_fundId_fkey` FOREIGN KEY (`fundId`) REFERENCES `Fund`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlannedPurchase` ADD CONSTRAINT `PlannedPurchase_fundId_fkey` FOREIGN KEY (`fundId`) REFERENCES `Fund`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
