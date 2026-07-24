import prisma from './prisma';

export const DEFAULT_SETTINGS = {
  stock_commission_rate: "0.1154", // 千分之，基础佣金率
  fund_commission_rate: "0.1",     // 千分之，场内开基佣金率
  transfer_fee_rate: "0.01",       // 千分之，过户费率
  stamp_duty_rate: "0.5",          // 千分之，印花税率
  ai_provider: "gemini",
  ai_chatgpt_key: "",
  ai_chatgpt_base_url: "https://api.openai.com/v1",
  ai_chatgpt_model: "gpt-4o-mini",
  ai_claude_key: "",
  ai_claude_base_url: "https://api.anthropic.com",
  ai_claude_model: "claude-3-5-haiku-latest",
  ai_gemini_key: "",
  ai_gemini_base_url: "https://generativelanguage.googleapis.com",
  ai_gemini_model: "gemini-2.0-flash",
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
