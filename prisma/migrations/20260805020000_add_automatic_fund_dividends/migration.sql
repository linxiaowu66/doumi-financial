ALTER TABLE `Fund`
    ADD COLUMN `dividendReinvest` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `PendingTransaction`
    ADD COLUMN `dividendReinvest` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `dividendRecordDate` DATETIME(3) NULL,
    ADD COLUMN `dividendPerShare` DECIMAL(10, 6) NULL,
    ADD COLUMN `sourceKey` VARCHAR(191) NULL,
    ADD COLUMN `remark` TEXT NULL;

CREATE UNIQUE INDEX `PendingTransaction_sourceKey_key`
    ON `PendingTransaction`(`sourceKey`);
