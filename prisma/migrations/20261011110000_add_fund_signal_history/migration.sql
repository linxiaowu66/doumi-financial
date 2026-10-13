CREATE TABLE `FundSignalDailySnapshot` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `directionId` INTEGER NOT NULL,
  `fundId` INTEGER NOT NULL,
  `date` VARCHAR(191) NOT NULL,
  `signal` VARCHAR(191) NOT NULL,
  `score` INTEGER NOT NULL,
  `reason` TEXT NOT NULL,
  `dataDate` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT `FundSignalDailySnapshot_fundId_fkey` FOREIGN KEY (`fundId`) REFERENCES `Fund` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE INDEX `FundSignalDailySnapshot_fundId_date_key` (`fundId`, `date`),
  INDEX `FundSignalDailySnapshot_userId_date_idx` (`userId`, `date`),
  INDEX `FundSignalDailySnapshot_directionId_date_idx` (`directionId`, `date`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
