type Holding = { code: string; name: string; weight: number | null };

function extractJson(source: string, name: string): unknown {
  const marker = `${name} = `;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const valueStart = start + marker.length;
  let depth = 0;
  let quote = false;
  for (let index = valueStart; index < source.length; index++) {
    const char = source[index];
    if (char === '"' && source[index - 1] !== "\\") quote = !quote;
    if (quote) continue;
    if (char === "{" || char === "[") depth++;
    if (char === "}" || char === "]") depth--;
    if (depth === 0 && char === ";") {
      try { return JSON.parse(source.slice(valueStart, index)); } catch { return null; }
    }
  }
  return null;
}

export async function fetchFundMetadata(code: string) {
  const headers = { "User-Agent": "Mozilla/5.0" };
  const [pageResponse, dataResponse] = await Promise.all([
    fetch(`https://fund.eastmoney.com/${encodeURIComponent(code)}.html`, { headers, cache: "no-store" }),
    fetch(`https://fund.eastmoney.com/pingzhongdata/${encodeURIComponent(code)}.js`, { headers, cache: "no-store" }),
  ]);
  if (!pageResponse.ok || !dataResponse.ok) throw new Error("基金资料源暂不可用");
  const html = await pageResponse.text();
  const script = await dataResponse.text();
  const typeMatch = html.match(/类型：<a[^>]*>([^<]+)<\/a>/);
  const asOf = html.match(/报告期[：:]\s*([0-9]{4}-[0-9]{2}-[0-9]{2})/)?.[1] ?? null;
  const holdings: Holding[] = [];
  const holdingPattern = /<a[^>]+title="([^"]+)"[^>]+>[^<]+<\/a>\s*<\/td>\s*<td[^>]*class="alignRight bold"[^>]*>([0-9.]+)%/g;
  for (const match of html.matchAll(holdingPattern)) {
    if (holdings.some((item) => item.name === match[1])) continue;
    holdings.push({ name: match[1], code: "", weight: Number(match[2]) });
    if (holdings.length >= 10) break;
  }
  if (holdings.length < 10) {
    const bondPattern = /<td[^>]+class="alignLeft"[^>]*>\s*([^<]+?)\s*<\/td>\s*<td[^>]+class="alignRight10"[^>]*>\s*([0-9.]+)%/g;
    for (const match of html.matchAll(bondPattern)) {
      const name = match[1].trim();
      if (!name || holdings.some((item) => item.name === name)) continue;
      holdings.push({ name, code: "", weight: Number(match[2]) });
      if (holdings.length >= 10) break;
    }
  }
  const stockCodes = extractJson(script, "stockCodes");
  const assetAllocation = extractJson(script, "Data_assetAllocation");
  if (Array.isArray(stockCodes)) holdings.forEach((item, index) => { item.code = String(stockCodes[index] ?? ""); });
  return {
    actualCategory: typeMatch?.[1]?.trim() ?? null,
    actualCategorySource: `东方财富基金详情 ${new Date().toISOString().slice(0, 10)}`,
    metadataAsOf: asOf,
    metadataJson: JSON.stringify({ assetAllocation, stockCodes, holdings }, null, 2),
  };
}
