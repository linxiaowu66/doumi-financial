import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth-scope";
import { getSystemSettings, updateSystemSetting } from "@/lib/system-settings";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const settings = await getSystemSettings();
    const publicSettings = Object.fromEntries(Object.entries(settings).filter(([key]) => key !== "qieman_bearer_token"));
    return NextResponse.json(publicSettings);
  } catch (error) {
    console.error("Failed to get system settings:", error);
    return NextResponse.json({ error: "获取系统设置失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "未登录" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const promises = Object.entries(body).map(([key, value]) => {
      if (key === "qieman_bearer_token" || key === "qieman_bearer_token_clear") return Promise.resolve();
      if (typeof value === "string" || typeof value === "number") {
        return updateSystemSetting(key, String(value));
      }
      return Promise.resolve();
    });
    await Promise.all(promises);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update system settings:", error);
    return NextResponse.json({ error: "更新系统设置失败" }, { status: 500 });
  }
}
