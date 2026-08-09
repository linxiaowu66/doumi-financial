-- CreateTable
CREATE TABLE `HouseholdMember` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `relation` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HouseholdMember_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HouseholdAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `memberId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `asOfDate` DATETIME(3) NOT NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `HouseholdAsset_userId_idx`(`userId`),
    INDEX `HouseholdAsset_memberId_idx`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsurancePolicy` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `insuredMemberId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `coverageAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `annualPremium` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL,
    `maturityDate` DATETIME(3) NULL,
    `refundableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InsurancePolicy_userId_idx`(`userId`),
    INDEX `InsurancePolicy_insuredMemberId_idx`(`insuredMemberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsurancePremiumPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `policyId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `paidAt` DATETIME(3) NOT NULL,
    `remark` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `InsurancePremiumPayment_policyId_year_key`(`policyId`, `year`),
    INDEX `InsurancePremiumPayment_policyId_idx`(`policyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HouseholdMember` ADD CONSTRAINT `HouseholdMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdAsset` ADD CONSTRAINT `HouseholdAsset_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HouseholdAsset` ADD CONSTRAINT `HouseholdAsset_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `HouseholdMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_insuredMemberId_fkey` FOREIGN KEY (`insuredMemberId`) REFERENCES `HouseholdMember`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePremiumPayment` ADD CONSTRAINT `InsurancePremiumPayment_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `InsurancePolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
