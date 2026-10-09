import { auth } from "@/auth";

export async function getAuthenticatedUserId(): Promise<number | null> {
  const session = await auth();
  const userId = Number(session?.user?.id);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}
