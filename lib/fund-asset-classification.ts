export type FundAssetClass = "EQUITY" | "FIXED_INCOME" | "GOLD" | "OTHER";

type AllocationSeries = { name?: string; data?: unknown[] };

function latestAllocation(metadataJson: string | null | undefined, name: string) {
  if (!metadataJson) return null;
  try {
    const metadata = JSON.parse(metadataJson) as { assetAllocation?: { series?: AllocationSeries[] } };
    const series = metadata.assetAllocation?.series?.find((item) => item.name === name);
    const values = series?.data?.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return values?.at(-1) ?? null;
  } catch {
    return null;
  }
}

function fromOfficialCategory(category: string | null | undefined, metadataJson: string | null | undefined): FundAssetClass {
  const value = category ?? "";
  if (/黄金|贵金属/.test(value)) return "GOLD";
  if (/债|固收|货币|偏债/.test(value)) return "FIXED_INCOME";
  if (/股票|权益|偏股/.test(value)) return "EQUITY";
  const stock = latestAllocation(metadataJson, "股票占净比") ?? 0;
  const bond = latestAllocation(metadataJson, "债券占净比") ?? 0;
  if (stock >= 50 && stock >= bond) return "EQUITY";
  if (bond >= 50 && bond > stock) return "FIXED_INCOME";
  return "OTHER";
}

function fromPersonalCategory(category: string | null | undefined, fundName: string) {
  const value = `${category ?? ""}${fundName}`;
  if (/黄金|贵金属/.test(value)) return "GOLD" as const;
  if (/固收|债券|短债|纯债/.test(value)) return "FIXED_INCOME" as const;
  if (/成长|创业|科创|科技|股票|权益/.test(value)) return "EQUITY" as const;
  return "OTHER" as const;
}

export function classifyFundAsset(input: {
  actualCategory: string | null | undefined;
  metadataJson: string | null | undefined;
  personalCategory: string | null | undefined;
  fundName: string;
}) {
  const officialClass = fromOfficialCategory(input.actualCategory, input.metadataJson);
  const personalClass = fromPersonalCategory(input.personalCategory, input.fundName);
  const assetClass = officialClass !== "OTHER" ? officialClass : personalClass;
  const categoryReview = officialClass !== "OTHER" && personalClass !== "OTHER" && officialClass !== personalClass;
  return { assetClass, officialClass, personalClass, categoryReview };
}
