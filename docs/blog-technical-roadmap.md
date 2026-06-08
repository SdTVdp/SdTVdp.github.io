# 博客技术改进执行设计

日期：2026-06-08

## 目标

把博客的技术改进清单拆成可执行、可验证、可回滚的工程任务。当前站点是 Hexo + Butterfly，已有 TypeScript 化的 Hexo 扩展、图片导入与优化、HTML sanitizer、自动分类、搜索索引、GitHub Pages 构建流程。本设计优先扩展这些已有机制，避免引入新的站点架构。

## 当前基础

- 图片导入与优化位于 `src/ts/hexo/markdown-image-importer.ts` 和 `src/ts/hexo/_shared/image-pipeline.ts`。
- HTML 安全过滤位于 `src/ts/hexo/html-sanitizer.ts`，已维护 `ALLOWED_TAGS` 和 `DROP_CONTENT_TAGS`。
- 自动分类位于 `src/ts/hexo/post-classification.ts`，当前按 `_posts/<年份>/<分类>/<子分类>/...` 推导分类。
- 搜索与 SEO 辅助逻辑位于 `src/ts/hexo/site-enhancements.ts`。
- 前端交互位于 `src/ts/client/custom.ts`，编译产物写入 `source/js/custom.js`。
- 样式覆盖位于 `source/css/custom.css`。
- CI 位于 `.github/workflows/pages.yml`，当前执行 `npm run build`。
- 模板位于 `scaffolds/`，当前已有 `post.md`、`note.md`、`writeup.md`。

## 实施原则

- 先做构建期基础设施，再做视觉与阅读体验。
- 每个阶段都必须能通过 `npm run typecheck` 和 `npm run build`。
- 只扩展现有 TypeScript Hexo 扩展，不迁移框架。
- 图片、安全、分类、搜索改动要有脚本级验收，避免只靠人工预览。
- 历史 WP 归档、科研日志、技术笔记要通过路径和模板共同约束。

## 阶段 1：基础设施与内容管线

优先级最高。这个阶段的目标是让内容生成质量变稳定：图片更快，分类标签更准确，搜索与 SEO 信息更完整，CI 能检查核心问题。

### 1. 响应式图片与 LQIP

目标文件：

- `src/ts/hexo/_shared/image-pipeline.ts`
- `src/ts/hexo/markdown-image-importer.ts`
- `_config.yml`

设计：

- 在图片 pipeline 中增加响应式变体配置，例如 `responsive_widths: [480, 768, 1200, 1600]`。
- 对可转换图片生成 WebP 或 AVIF 主格式的多尺寸文件。
- 生成低清预览图数据或小尺寸文件，作为 LQIP。
- `rewriteMarkdownImages`、`rewriteObsidianImages`、`rewriteHtmlImages` 继续统一调用图片导入逻辑，确保远程图片下载后仍进入 `optimizeImageAtPath`。
- Markdown 图片输出优先保持 Markdown 语义；当需要 `srcset`、`sizes`、LQIP 时，转换成安全的 `<img>` 标签。
- HTML `<img>` 保留原有安全属性，并补充 `srcset`、`sizes`、`data-lqip`、`width`、`height`。

验收：

- 本地图片、远程图片、Obsidian 图片、HTML 图片都会被导入或优化。
- 生成的 HTML 图片带 `loading="lazy"` 和 `decoding="async"`。
- 生成的 `srcset` 文件实际存在。
- 非图片、SVG、GIF 不被错误转换。

### 2. 分类与默认标签规则

目标文件：

- `src/ts/hexo/post-classification.ts`
- `src/ts/hexo/hexo-env.d.ts`
- `tutorial/guides/organization/structure-roadmap.md`

设计：

- 保留当前“无手写分类时才自动设置分类”的行为。
- 增加路径映射：
  - `source/_posts/archive/ctf/` 映射为 `历史 WP`，默认标签 `ctf-wp`、`re-history`。
  - `source/_posts/series/re-technical-notes/` 映射为 `技术笔记`，默认标签 `re-tech-note`、`vm-analysis`、`crypto`。
  - `source/_posts/research/ai/` 映射为 `科研日志`，默认标签 `ai-explainable`、`deep-learning`、`transformer`、`self-supervised`、`tda`、`fluid-dynamics`。
- 当前已有的年份路径继续按目录推导，例如 `source/_posts/2025/ctf/re/...` 仍生成 `ctf/re`。
- 默认标签只在文章未显式设置对应标签时补充，不覆盖作者手动标签。

验收：

- 已有 CTF 文章分类不被破坏。
- 新路径文章可以自动获得指定分类与默认标签。
- 手写分类或标签不会被覆盖。

### 3. 文章模板

目标文件：

- `scaffolds/research.md`
- `scaffolds/tech-note.md`
- `scaffolds/writeup.md`
- `README.md`

设计：

- 新增科研日志模板，包含 `categories: [ai-research]`、推荐 tags、`excerpt`、`description`、`updated`。
- 科研日志正文块为 `背景`、`实验`、`结果`、`反思与下一步`。
- 新增技术笔记模板，默认包含 `re-tech-note`。
- WP 历史文章模板加入学习参考提示。
- README 增加创建命令示例，说明推荐路径。

验收：

- `hexo new research "标题"` 能生成科研日志模板。
- `hexo new tech-note "标题"` 能生成技术笔记模板。
- `hexo new writeup "标题"` 继续可用，并带历史提示。

### 4. 搜索索引增强

目标文件：

- `src/ts/hexo/site-enhancements.ts`
- `src/ts/hexo/_shared/post-utils.ts`

设计：

- `search-index.json` 增加 `categories`、`tags`、`excerpt`、`description`、`codeText`、`formulaText`。
- `codeText` 从 `<code>`、`<pre>` 中提取纯文本。
- `formulaText` 从 KaTeX/MathML 或常见公式容器中提取文本。
- 保留现有 `content` 字段，避免旧前端搜索失效。

验收：

- 构建后的 `public/search-index.json` 中每篇文章包含新字段。
- 搜索索引中不包含 HTML 标签。
- 代码块内容可被索引。

### 5. SEO 与分享基础

目标文件：

- `src/ts/hexo/site-enhancements.ts`
- `_config.butterfly.yml`

设计：

- 继续把 `excerpt` 同步到 `description`。
- 当文章缺少 `description` 时，从正文生成稳定长度的纯文本描述。
- 为科研日志保留 `external_refs` 或 `doi` front matter 预留字段，不主动生成虚假 DOI。
- 首页精选卡片使用已有 `post_summary` helper，不在第一阶段重做首页布局。

验收：

- 文章页有可用 description。
- 没有 DOI 的文章不会输出伪 DOI。
- 构建不破坏 Butterfly 主题元信息。

### 6. CI 与测试脚本

目标文件：

- `tools/verify-blog-pipeline.js`
- `package.json`
- `.github/workflows/pages.yml`

设计：

- 增加 `npm run verify:blog`。
- 验证 Markdown/HTML 图片引用对应文件是否存在或是允许的远程 URL。
- 验证响应式图片的 `srcset` 目标存在。
- 验证分类标签规则的代表样例。
- 验证 `public/search-index.json` 字段完整。
- CI 在 `npm run build` 后执行 `npm run verify:blog`。

验收：

- CI 能在图片丢失、搜索索引缺字段、分类标签异常时失败。
- 本地执行 `npm run build` 和 `npm run verify:blog` 能完成。

## 阶段 2：阅读体验与前端交互

第二阶段在基础管线稳定后执行，避免视觉改动和构建管线改动互相干扰。

### 1. 动效作用域

目标文件：

- `src/ts/client/custom.ts`
- `source/css/custom.css`

设计：

- 粒子、光束、流星等环境动效只在首页或博客列表页强显示。
- 文章页默认弱化，阅读模式下关闭。
- 尊重 `prefers-reduced-motion`。

验收：

- 首页仍有实验室感。
- 文章页滚动和阅读时没有明显干扰。
- 减少动态偏好开启时不渲染强动效。

### 2. 阅读模式

目标文件：

- `src/ts/client/custom.ts`
- `source/css/custom.css`

设计：

- 增加右侧阅读控制入口。
- 支持隐藏侧边栏和动态效果。
- 支持字体大小和行高调节。
- 设置写入 `localStorage`，跨页面保留。

验收：

- 桌面和移动端都能进入阅读模式。
- 退出阅读模式后恢复侧边栏和动效策略。
- 字号、行高不会造成按钮或正文重叠。

### 3. TOC 与移动端菜单

目标文件：

- `src/ts/client/custom.ts`
- `source/css/custom.css`

设计：

- TOC 当前项高亮更稳定。
- 点击 TOC 时滚动到视口中间附近。
- 移动端 TOC 和菜单按钮使用平滑过渡。

验收：

- 长文章滚动时 TOC 高亮准确。
- 点击 TOC 后标题不被导航遮挡。
- 移动端菜单动画不卡顿。

## 阶段 3：长期维护与内容页面

### 1. `/now` 页面

目标文件：

- `source/now/index.md`
- `_config.butterfly.yml`

设计：

- 新增 `/now` 页面展示当前实验、论文、技术笔记进度。
- 菜单增加 `Now` 或 `现在` 入口。
- 页面内容保持手动维护，不自动生成虚假进度。

验收：

- `/now/` 可访问。
- 菜单入口显示正常。

### 2. 最后更新日期

目标文件：

- `_config.butterfly.yml`
- `layout/` 覆盖模板或样式文件

设计：

- 优先使用 Butterfly 的 `date_type: both`。
- 如主题显示不足，再增加局部覆盖模板。

验收：

- 文章能显示创建日期和最后更新日期。

### 3. 历史 WP 归档策略

目标文件：

- `README.md`
- `tutorial/guides/organization/archive-and-tags.md`

设计：

- 明确历史 WP 不再更新。
- 旧文章可迁移到 `source/_posts/archive/ctf/`，迁移时保持 permalink 或 slug，避免链接断裂。

验收：

- 文档清楚说明迁移方式。
- 迁移文章仍能被搜索和归档。

## 第一批实际落地范围

本次执行优先实现阶段 1 中的以下内容：

- 分类与默认标签规则。
- 文章模板。
- 搜索索引增强。
- SEO description 补强。
- CI 验证脚本。

响应式图片与 LQIP 是高价值但改动面较大的功能，本次会先在设计和验收中固定接口；实际编码时若现有构建验证稳定，再作为同批扩展，否则进入下一批。

## 风险与控制

- 响应式图片可能显著增加生成文件数量，需要通过配置限制宽度集合。
- HTML 图片转换为 `<img>` 时必须符合 sanitizer 白名单，新增属性需要同步到 `html-sanitizer.ts`。
- 自动标签如果过于激进会污染历史文章，因此只补充缺失的默认标签。
- 视觉动效改动必须移动端验证，避免阅读体验变差。
- DOI 和外部引用只能作为预留字段，不能自动生成不存在的引用。

## 验证命令

```bash
npm run typecheck
npm run build
npm run verify:blog
```

## 完成标准

- 设计文件与实现任务保持一致。
- 阶段 1 改动通过类型检查、构建和博客 pipeline 验证。
- 新增模板可以通过 Hexo scaffold 使用。
- 搜索索引字段完整且不含 HTML。
- CI 能在 GitHub Pages 构建时执行验证。
