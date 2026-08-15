-- CreateTable
CREATE TABLE `InsurancePlan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `insuredMemberId` INTEGER NULL,
    `type` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NOT NULL DEFAULT 'LONG_TERM',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InsurancePlan_userId_idx`(`userId`),
    INDEX `InsurancePlan_insuredMemberId_idx`(`insuredMemberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `InsurancePolicy`
    ADD COLUMN `planId` INTEGER NULL,
    ADD COLUMN `policyNumber` VARCHAR(191) NULL;

-- Backfill one protection plan for every existing policy, preserving ids for a direct mapping.
INSERT INTO `InsurancePlan` (`id`, `userId`, `insuredMemberId`, `type`, `mode`, `createdAt`, `updatedAt`)
SELECT `id`, `userId`, `insuredMemberId`, `type`,
       CASE WHEN `type` IN ('ACCIDENT', 'MEDICAL') THEN 'ANNUAL' ELSE 'LONG_TERM' END,
       `createdAt`, `updatedAt`
FROM `InsurancePolicy`;

UPDATE `InsurancePolicy` SET `planId` = `id`;

ALTER TABLE `InsurancePolicy` MODIFY `planId` INTEGER NOT NULL;

CREATE INDEX `InsurancePolicy_planId_idx` ON `InsurancePolicy`(`planId`);

-- AddForeignKey
ALTER TABLE `InsurancePlan` ADD CONSTRAINT `InsurancePlan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePlan` ADD CONSTRAINT `InsurancePlan_insuredMemberId_fkey` FOREIGN KEY (`insuredMemberId`) REFERENCES `HouseholdMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `InsurancePlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
