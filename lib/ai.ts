import { GoogleGenAI } from "@google/genai";
import { ProxyAgent, setGlobalDispatcher } from "undici";

// 如果设置了 HTTPS_PROXY，让 Node.js 内置 fetch 走代理
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  console.log(`[Proxy] Using proxy: ${proxyUrl}`);
}

export class GeminiService {
  private static ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      baseUrl: process.env.GEMINI_BASE_URL || undefined,
    }
  });

  static async analyzeInvestmentDirection(data: Record<string, unknown>) {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return "请在环境变量中配置 GEMINI_API_KEY 才能使用 AI 分析功能。";
      }

      const prompt = `你是一个专业的理财顾问和投资分析师。请分析该投资方向账户当前的状况：
1. **账户整体情况**：分析其预期投入、实际投入、目前持仓总成本、当前市值、累计收益、本月盈亏等，评估其达成率和整体盈利表现。
2. **基金配置分析**：根据各个分类的仓位占比、各只基金的盈亏表现，分析当前仓位是否合理，是否存在单只基金或单个分类仓位过重、亏损过大的风险。
3. **近期交易分析**：回顾本月或近期的买入、卖出动作，评价其操作的合理性（如是否在低点加仓，高点止盈，或是频繁交易等）。
4. **宏观经济与市场环境**：简要结合当前国内外的宏观经济政策和市场环境（如降息周期、政策刺激等），给出你对未来一段时间市场的看法。
5. **投资建议与行动指南**：
   - 给出具体的减仓建议（如哪些基金表现不佳、仓位过重需要减仓）。
   - 给出加仓建议（如哪些基金处于低估值、有潜力且仓位较轻可以加仓）。
   - 如何通过调整策略来达成年度营收目标。

请使用 Markdown 格式输出分析报告，条理清晰，客观专业。

**以下是该账户的详细数据**：
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      return response.text ?? "AI 分析未返回结果。";
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      return "AI 分析失败，请检查 API 配置或网络。";
    }
  }
}
