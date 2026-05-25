const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const { spawn } = require("node:child_process");

const cwd = process.cwd();
const configPath = join(cwd, "_config.yml");

const readConfig = () => {
  if (!existsSync(configPath)) {
    return "";
  }

  return readFileSync(configPath, "utf8");
};

const readAlgoliaValue = (name, configText) => {
  const match = configText.match(new RegExp(`^\\s*${name}:\\s*(.*)$`, "m"));
  if (!match) {
    return "";
  }

  return match[1].trim().replace(/^['"]|['"]$/g, "");
};

const isConfigured = (value) => Boolean(value && value !== '""' && value !== "''");

const configText = readConfig();
const appId = process.env.ALGOLIA_APP_ID || readAlgoliaValue("appId", configText);
const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY || readAlgoliaValue("adminApiKey", configText);
const indexName = process.env.ALGOLIA_INDEX_NAME || readAlgoliaValue("indexName", configText);
const searchApiKey = process.env.ALGOLIA_API_KEY || readAlgoliaValue("apiKey", configText);

const missing = [];

if (!isConfigured(appId)) {
  missing.push("ALGOLIA_APP_ID / algolia.appId");
}

if (!isConfigured(adminApiKey)) {
  missing.push("ALGOLIA_ADMIN_API_KEY / algolia.adminApiKey");
}

if (!isConfigured(indexName)) {
  missing.push("ALGOLIA_INDEX_NAME / algolia.indexName");
}

if (missing.length > 0) {
  console.error("Algolia 索引配置还没有补齐。");
  console.error("");
  console.error("缺少以下字段：");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  console.error("");
  console.error("建议做法：");
  console.error("1. 在 _config.yml 里填写 appId / indexName / 搜索用 apiKey。");
  console.error("2. 把 adminApiKey 放到环境变量 ALGOLIA_ADMIN_API_KEY 里，不要提交到 Git。");
  console.error("3. 然后再运行 npm run algolia:index。");
  process.exit(1);
}

if (!isConfigured(searchApiKey)) {
  console.warn("警告：algolia.apiKey / ALGOLIA_API_KEY 还没有设置。");
  console.warn("这不会阻止索引上传，但如果你切到 Algolia 前端搜索，站点前端会缺少 Search-Only Key。");
  console.warn("");
}

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

const child = spawn(npxCommand, ["hexo", "algolia", ...process.argv.slice(2)], {
  cwd,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error("启动 Hexo Algolia 索引命令失败。");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
