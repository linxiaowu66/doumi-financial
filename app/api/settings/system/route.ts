import { NextResponse } from "next/server";
import { getSystemSettings, updateSystemSetting } from "@/lib/system-settings";

export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Failed to get system settings:", error);
    return NextResponse.json({ error: "获取系统设置失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const promises = Object.entries(body).map(([key, value]) => {
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
