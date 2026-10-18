CREATE TABLE `SignalVirtualAccount` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `name` VARCHAR(191) NOT NULL DEFAULT '默认虚拟信号账户',
  `initialCash` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `cash` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `startingPositionsJson` LONGTEXT NOT NULL,
  `asOfDate` VARCHAR(10) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SignalVirtualAccount_userId_name_key` (`userId`, `name`),
  INDEX `SignalVirtualAccount_userId_updatedAt_idx` (`userId`, `updatedAt`),
  CONSTRAINT `SignalVirtualAccount_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `SignalVirtualTrade` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `virtualAccountId` INTEGER NOT NULL,
  `directionId` INTEGER NOT NULL,
  `fundId` INTEGER NOT NULL,
  `signalDate` VARCHAR(10) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `price` DECIMAL(10,4) NOT NULL,
  `shares` DECIMAL(18,6) NOT NULL,
  `fee` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `reason` TEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `SignalVirtualTrade_virtualAccountId_fundId_signalDate_key` (`virtualAccountId`, `fundId`, `signalDate`),
  INDEX `SignalVirtualTrade_virtualAccountId_signalDate_idx` (`virtualAccountId`, `signalDate`),
  INDEX `SignalVirtualTrade_fundId_signalDate_idx` (`fundId`, `signalDate`),
  CONSTRAINT `SignalVirtualTrade_virtualAccountId_fkey` FOREIGN KEY (`virtualAccountId`) REFERENCES `SignalVirtualAccount` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SignalVirtualTrade_directionId_fkey` FOREIGN KEY (`directionId`) REFERENCES `InvestmentDirection` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `SignalVirtualTrade_fundId_fkey` FOREIGN KEY (`fundId`) REFERENCES `Fund` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
