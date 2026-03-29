const fs = require("fs");

let pageTsx = fs.readFileSync("app/(protected)/funds/[id]/page.tsx", "utf8");

pageTsx = pageTsx.replace(
  /const \[systemSettings, setSystemSettings\] = useState<Record<string, string>>\(\{\}\);\s*/g,
  "",
);
pageTsx = pageTsx.replace(
  "const [fund, setFund] = useState<Fund | null>(null);",
  "const [fund, setFund] = useState<Fund | null>(null);\n  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});\n",
);

pageTsx = pageTsx.replace(
  /const loadSystemSettings = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);\s*/g,
  "",
);
pageTsx = pageTsx.replace(
  "const loadFund = useCallback(async () => {",
  'const loadSystemSettings = useCallback(async () => {\n    try {\n      const response = await fetch("/api/settings/system");\n      const data = await response.json();\n      setSystemSettings(data);\n    } catch (error) {\n      console.error("加载系统设置失败:", error);\n    }\n  }, []);\n\n  const loadFund = useCallback(async () => {',
);

fs.writeFileSync("app/(protected)/funds/[id]/page.tsx", pageTsx);

let settingsTsx = fs.readFileSync("app/(protected)/settings/page.tsx", "utf8");

settingsTsx = settingsTsx.replace(
  /const handleSaveSettings = async \(\) => \{[\s\S]*?message\.error\('保存失败'\);\s*\}\s*\};\s*/g,
  "",
);
settingsTsx = settingsTsx.replace(
  "const handleModalFinish = async",
  'const handleSaveSettings = async () => { try { const res = await fetch("/api/settings/system", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(systemSettings) }); if (res.ok) { message.success("费率设置已保存"); } else { message.error("保存失败"); } } catch { message.error("保存失败"); } };\n\n  const handleModalFinish = async',
);

fs.writeFileSync("app/(protected)/settings/page.tsx", settingsTsx);
