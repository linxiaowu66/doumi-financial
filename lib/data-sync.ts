import prisma from "@/lib/prisma";

export type DataSyncKind = "NET_WORTH" | "QIEMAN" | "METADATA";

export async function startDataSyncRun(userId: number | null, kind: DataSyncKind, scope?: string) {
  return prisma.dataSyncRun.create({ data: { userId, kind, scope: scope || null } });
}

export async function finishDataSyncRun(
  id: number,
  result: { status: "SUCCESS" | "FAILED"; asOfDate?: string | null; itemCount?: number; errorMessage?: string | null; detailsJson?: unknown },
) {
  return prisma.dataSyncRun.update({
    where: { id },
    data: {
      status: result.status,
      asOfDate: result.asOfDate || null,
      itemCount: result.itemCount ?? 0,
      errorMessage: result.errorMessage || null,
      detailsJson: result.detailsJson === undefined ? undefined : JSON.stringify(result.detailsJson),
      completedAt: new Date(),
    },
  });
}
