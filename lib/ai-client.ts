export type AiProvider = "chatgpt" | "claude" | "gemini";

export type AiSettings = Record<string, string> & { ai_provider?: string };

const joinUrl = (baseUrl: string, path: string) => `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

const prompt = (data: Record<string, unknown>) => `你是一个专业的理财顾问和投资分析师。请分析该投资方向账户当前的状况：
1. 账户整体情况：分析预期投入、实际投入、持仓总成本、当前市值、累计收益、本月盈亏，评估达成率和盈利表现。
2. 基金配置分析：分析分类仓位和各基金盈亏，指出仓位过重或亏损风险。
3. 近期交易分析：评价近期买入、卖出动作是否合理。
4. 宏观经济与市场环境：简要说明相关市场环境，但不要编造实时数据。
5. 投资建议与行动指南：给出具体的加仓、减仓和达成年度目标建议，并说明风险。

请使用 Markdown 格式输出，客观专业，不构成投资承诺。

以下是账户详细数据：
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\``;

const strategyPrompt = (data: Record<string, unknown>) => `你是一个谨慎、客观的投资组合策略分析师。请根据下面的投资组合数据和规则预警，生成今日策略报告。

重点分析：
1. 哪些基金已经达到止盈观察线，哪些已经从高点回撤并建议分批止盈；明确说明建议卖出比例，但不要假装可以预测最高点。
2. 哪些资产风险较高、仓位过重或近期表现异常。
3. 当前整体仓位、收益和资金配置是否需要调整。
4. 给出“继续持有 / 观察 / 分批止盈 / 暂缓加仓”四类明确建议。

只使用提供的数据，不要编造实时行情、新闻或估值。报告使用 Markdown，开头注明“仅供投资决策参考，不构成投资建议”。

投资组合数据：
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\``;

async function requestAi(provider: AiProvider, settings: AiSettings, input: string) {
  const key = settings[`ai_${provider}_key`];
  if (!key) throw new Error(`请先在系统设置中配置 ${provider} API Key`);

  const model = settings[`ai_${provider}_model`];
  const baseUrl = settings[`ai_${provider}_base_url`];
  let response: Response;

  if (provider === "chatgpt") {
    response = await fetch(joinUrl(baseUrl, "chat/completions"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "user", content: input }] }),
    });
  } else if (provider === "claude") {
    response = await fetch(joinUrl(baseUrl, "v1/messages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: "user", content: input }] }),
    });
  } else {
    response = await fetch(`${joinUrl(baseUrl, `v1beta/models/${encodeURIComponent(model)}:generateContent`)}?key=${encodeURIComponent(key)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: input }] }] }),
    });
  }

  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || result.message || "AI 分析请求失败");
  return provider === "chatgpt"
    ? result.choices?.[0]?.message?.content
    : provider === "claude"
      ? result.content?.[0]?.text
      : result.candidates?.[0]?.content?.parts?.[0]?.text;
}

export function analyzeWithAi(provider: AiProvider, settings: AiSettings, data: Record<string, unknown>) {
  return requestAi(provider, settings, prompt(data));
}

export function analyzeStrategyWithAi(provider: AiProvider, settings: AiSettings, data: Record<string, unknown>) {
  return requestAi(provider, settings, strategyPrompt(data));
}
