# 2026-04-25 代码审计报告

## 审计范围

审计对象为 `D:\my blog` 下的博客仓库，覆盖：

- Hexo / Butterfly 配置：`_config.yml`、`_config.butterfly.yml`。
- 构建、发布、部署脚本：`package.json`、`.github/workflows/pages.yml`、`git-publish.bat`、`tools/`、`scripts/`。
- TypeScript 源码：`src/ts/hexo/`、`src/ts/client/`。
- 主题覆盖与静态前端代码：`themes/`、`layout/`、`source/`。
- 维护文档：`README.md`、`tutorial/`。

以下内容按生成物或第三方依赖处理，不作为源码审计重点：`node_modules/`、`public/`、`dist/`、`db.json`。

## 工作区状态

审计开始时已经存在以下未提交改动：

- 已修改：`package.json`
- 已修改：`package-lock.json`
- 已修改：`src/ts/hexo/hexo-env.d.ts`
- 未跟踪：`tools/run-algolia-index.js`

这些改动被视为已有工作，本次审计没有回滚它们。

## 验证结果

| 命令 | 结果 | 备注 |
| --- | --- | --- |
| `npm run typecheck` | 通过 | Hexo 端和浏览器端 TypeScript 检查均通过。 |
| `npm run build` | 通过 | Hexo clean/generate 成功，生成 341 个文件。 |
| `npm audit --audit-level=moderate` | 通过 | 已修复依赖漏洞，当前 0 vulnerabilities。 |
| `npm ls dompurify` | 信息项 | `dompurify` 已升级到 `3.4.1`，仍由 `hexo-renderer-marked@7.0.1` 引入。 |

## 整改结果

- 已通过 `npm audit fix` 将 `dompurify` 从 `3.3.3` 升级到 `3.4.1`。
- 已在 `src/ts/hexo/markdown-image-importer.ts` 中改为手动跟随重定向，并对每一次 `Location` 目标重新执行远程 URL 安全校验。
- 已在 `_config.yml` 中显式补充 `image_pipeline` 配置块。
- 已更新 README，说明当前活动主题是 Butterfly/Pug，`themes/minimal-cascade/` 是非活动的旧版/实验主题。
- 已在 `.gitignore` 中忽略 `tmp-*.log` / `*.log`，并移除已跟踪的本地 Hexo server 临时日志。
- 已在 `git-publish.bat` 中加入暂存摘要和 commit/push 前确认步骤。
- `tools/run-algolia-index.js` 已作为待提交的新文件保留在工作区，应与 `package.json` / `package-lock.json` 中的 Algolia 脚本改动一起提交。

## 问题清单

### 已修复：传递依赖 DOMPurify 存在漏洞

`npm audit` 报告 `dompurify@3.3.3` 存在中危漏洞，对应 `package-lock.json:1356`，并由 `hexo-renderer-marked` 引入（`package-lock.json:1921`）。

影响：项目有自己的 post-render HTML sanitizer，但 Markdown 渲染器依赖链里仍然带着有漏洞的 sanitizer。后续维护时也可能误以为渲染器层面的清洗能力是安全边界。

处理：已执行 `npm audit fix`，并重新运行 `npm audit --audit-level=moderate`，当前 0 vulnerabilities。

### 已修复：远程图片下载未重新校验重定向目标

`src/ts/hexo/markdown-image-importer.ts:170` 会校验原始远程 URL，并阻止 localhost/private host；但真正下载时的 `fetch` 位于 `src/ts/hexo/markdown-image-importer.ts:370`，使用默认重定向行为。

影响：如果 Markdown 图片链接指向一个公网地址，而该地址在构建时重定向到 localhost 或内网地址，就可能形成构建期 SSRF 风险。只处理完全可信的本地笔记时风险较低，但从外部工具导入 Markdown 时仍建议加固。

处理：已将 `fetch` 改为 `redirect: "manual"`，限制最多 5 次重定向，并对每一次 `Location` 目标重新执行安全校验。

### 已修复：README 中的图片管线配置与实际配置不一致

`README.md:346` 记录了 `image_pipeline:` 配置块，但当前 `_config.yml` 没有这个配置。实际运行时会从 `src/ts/hexo/_shared/image-pipeline.ts:57` 读取配置并回退到默认值，且在 `src/ts/hexo/_shared/image-pipeline.ts:72` 默认启用。

影响：维护者可能以为可见配置才是实际配置来源，但站点当前依赖的是代码默认值。

处理：已将 README 中记录的 `image_pipeline` 配置补进 `_config.yml`。

### 已修复：模板引擎说明存在歧义

`README.md:7`、`README.md:76`、`README.md:83` 表示模板层已经统一为 Pug 且没有 EJS 页面层代码。当前活动主题确实是 `butterfly`（`_config.yml:58`），但 `themes/minimal-cascade/layout/*.ejs` 仍存在。

影响：后续维护时可能误删或误改非活动主题，也可能误以为仓库完全没有 EJS 模板。

处理：已在 README 中说明 Butterfly/Pug 是当前活动主题路径，而 `themes/minimal-cascade/` 是非活动的旧版或实验主题。

### 已修复：本地服务日志被纳入版本控制

`tmp-hexo-server-4001.log` 和 `tmp-hexo-server-4001.err.log` 当前是已跟踪文件，而 `.gitignore` 忽略了生成目录，却没有忽略临时日志。

影响：后续本地日志容易被误提交，造成无意义 diff，或泄露本地命令输出。

处理：已在 `.gitignore` 中加入 `tmp-*.log` 和 `*.log`，并删除已跟踪的临时日志文件。

### 已修复：发布脚本会全量暂存并直接推送 main

`git-publish.bat:54` 执行 `git add -A`，`git-publish.bat:71` 直接推送到 `origin main`。

影响：对个人博客很方便，但当工作区里有实验改动、生成物或未完成内容时，容易被一起提交发布。

处理：已在 `git-publish.bat` 暂存后打印 `git diff --cached --stat`，并要求确认后再 commit/push。

### 已处理：Algolia 辅助脚本尚未完整纳入版本控制

`package.json` 已经引用 `tools/run-algolia-index.js`，但审计时该文件仍是未跟踪文件。

影响：如果只提交 package 改动而没有提交这个工具脚本，新的克隆环境中 `npm run algolia:index` 会失败。默认构建不受影响。

处理：`tools/run-algolia-index.js` 已保留为本次待提交的新文件。提交时需要与 `package.json` / `package-lock.json` 中的 Algolia 改动一起纳入。

## 已观察到的正向控制

- `html-sanitizer.ts` 使用标签/属性 allowlist，阻止 script/form/iframe，移除事件处理器和内联样式，并限制 URL 协议。
- 动态文章 demo 使用安全静态挂载点，在 sanitizer 之后由浏览器端脚本初始化 UI。
- 图片下载设置了 20 MB 上限，并在初始请求前阻止明显的 localhost/private IP 目标。
- 构建流程会先编译 TypeScript，再执行 Hexo 生成。
- GitHub Pages workflow 使用 `npm ci`，在 CI 中从源码构建。

## 建议处理顺序

1. 提交本次整改改动时，确保 `tools/run-algolia-index.js` 与 package 改动一起提交。
2. 后续如果开启 Algolia 前端搜索，再补充 `_config.yml` 中的 `algolia` 配置和 GitHub Actions secret。
3. 下次审计继续关注依赖漏洞、远程资源导入边界和发布脚本行为。
