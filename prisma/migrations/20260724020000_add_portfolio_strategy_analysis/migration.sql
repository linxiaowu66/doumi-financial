CREATE TABLE `PortfolioStrategyAnalysis` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `content` LONGTEXT NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `PortfolioStrategyAnalysis_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
