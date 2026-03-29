import prisma from './prisma';

export const DEFAULT_SETTINGS = {
  stock_commission_rate: "0.1154", // 千分之，基础佣金率
  fund_commission_rate: "0.1",     // 千分之，场内开基佣金率
  transfer_fee_rate: "0.01",       // 千分之，过户费率
  stamp_duty_rate: "0.5",          // 千分之，印花税率
};

export async function getSystemSettings() {
  const settings = await prisma.systemSetting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  settings.forEach(s => {
    map[s.key] = s.value;
  });
  return map;
}

export async function updateSystemSetting(key: string, value: string, description?: string) {
  return await prisma.systemSetting.upsert({
    where: { key },
    update: { value, ...(description ? { description } : {}) },
    create: { key, value, description },
  });
}
