# SdTVdp.github.io 维护手册

这个仓库现在是一个 **Hexo + Butterfly** 的 GitHub Pages 站点，已经做了以下几项基础优化：

- 站点级和文章级图片会在构建时自动转成 `WebP`
- Markdown 中的本地图片、Obsidian 图片、HTML `<img>`、语雀远程图片可以自动导入
- 主题覆盖层统一使用 **Pug**，已经移除 `EJS` 渲染器依赖
- 高风险脚本已经迁移到 **TypeScript**，构建前会先跑类型检查
- 代码字体优先使用 **JetBrains Mono**
- 首页搜索、置顶文章、分类、标签、归档、TOC 仍然保留

## 当前路由

- `/`：主页落地页
- `/about/`：详细自我介绍页
- `/blog/`：博客主界面
- `/archives/`：归档页
- `/tags/`：标签页
- `/categories/`：分类页

## 目录说明

```text
.
├─ _config.yml
├─ _config.butterfly.yml
├─ scaffolds/
├─ scripts/
├─ src/
│  └─ ts/
│     ├─ client/
│     └─ hexo/
├─ source/
│  ├─ _posts/
│  ├─ about/
│  ├─ categories/
│  ├─ css/
│  ├─ js/
│  ├─ tags/
│  └─ uploads/
├─ tools/
└─ .github/workflows/
```

最常用的几个目录：

- `source/_posts/`：文章主目录
- `source/uploads/backgrounds/`：背景图、封面图、头图原图
- `source/uploads/imported/`：自动缓存导入后的 Markdown 图片
- `src/ts/hexo/`：Hexo 扩展脚本的 TypeScript 源码
- `src/ts/client/custom.ts`：全站通用交互的前端 TS 源码
- `src/ts/client/demos/`：文章内动态演示脚本，例如密码学 demo
- `scripts/`：Hexo 真实加载的薄包装入口
- `scaffolds/`：`hexo new` 生成 Markdown 模板时会读取这里

## 为什么没有直接上 Astro

这次我**没有**把当前站点硬改成 Astro。

原因不是 Astro 不好，而是它的 Hydration / Islands 更像一次“站点架构迁移”，不属于在现有 Hexo 仓库里加一个小功能就能稳定完成的优化。强行混进去，反而会让部署、主题覆盖和日常维护变复杂。

所以当前这版的优化路线是：

- 保留 Hexo + Butterfly 的稳定内容工作流
- 统一模板引擎到 Pug
- 用 TypeScript 提高脚本稳健性
- 用 `sharp` 做图片压缩和格式转换
- 用主题原生能力开启站点级懒加载

如果你以后真的想迁到 Astro，我建议把它当成一个独立项目来做，而不是在这个仓库里逐步缝进去。

## 模板引擎选择

当前仓库已经统一为：

- **保留 Pug**
- **移除 EJS 渲染器依赖**

原因很简单：

- Butterfly 主题本身就是 Pug
- 你现在的站点覆盖模板也是 Pug
- 仓库里没有继续依赖 EJS 的页面层代码

所以现在模板层只有一条主线，后续会更容易维护。

## 本地开发命令

首次安装依赖：

```bash
npm install
```

只跑类型检查：

```bash
npm run typecheck
```

完整构建：

```bash
npm run build
```

本地预览：

```bash
npm run server
```

清理 `public/`、Hexo 缓存和 TypeScript 产物：

```bash
npm run clean
```

## TypeScript 改造说明

现在的结构不是“直接让 Hexo 执行 `.ts` 文件”，而是更稳的两层结构：

1. `src/ts/hexo/` 保存真正的 TypeScript 源码
2. `scripts/*.js` 只是很薄的一层入口，由 Hexo 调用
3. `npm run build` 时先跑 `tsc`
4. 编译产物写到 `dist/hexo/`
5. 浏览器端脚本由 `src/ts/client/` 编译到 `source/js/`
6. 全站逻辑继续放在 `src/ts/client/custom.ts`
7. 单篇文章 demo 放在 `src/ts/client/demos/*.ts`

这样做的好处是：

- Hexo 的加载机制不用被硬改
- 你能享受到 TypeScript 类型检查
- 运行时仍然是普通 JavaScript，部署稳定

如果你改了 `src/ts/` 里的源码，记得重新执行：

```bash
npm run build
```

## 文章目录结构

现在推荐固定使用三级目录：

```text
source/_posts/<年份>/<一级目录>/<二级目录>/article.md
```

例如：

```text
source/_posts/2025/ctf/re/蓝桥杯两道逆向.md
source/_posts/2025/ctf/re/SdTVdp 2025412TGCTF.md
source/_posts/2026/guides/search/local-search-notes.md
source/_posts/2026/ctf/event-review/polaris-ctf-review.md
```

这样做的效果：

- 第一级目录：年份，例如 `2025`、`2026`
- 第二级目录：大分类，例如 `ctf`、`guides`
- 第三级目录：细分类，例如 `re`、`search`、`event-review`
- 如果你没有手动写 `categories`，站点会自动跳过“年份”这一层，从内容目录开始映射分类
- 比赛名建议放到 `tags`，具体题解按题型归档，整场复盘归到 `ctf/event-review/`

## Hexo scaffolds 是什么

`scaffolds/` 可以理解成 **Hexo 的“新建文章模板”目录**。

当你执行：

```bash
hexo new post "标题"
```

Hexo 会去找：

- `scaffolds/post.md`

然后把里面的内容复制成一篇新的 Markdown，并自动替换：

- `{{ title }}`
- `{{ date }}`

同理：

- `hexo new page "关于"` 对应 `scaffolds/page.md`
- `hexo new draft "草稿"` 对应 `scaffolds/draft.md`
- `hexo new note "搜索笔记"` 对应 `scaffolds/note.md`
- `hexo new writeup "题解"` 对应 `scaffolds/writeup.md`

### 这套仓库里已经准备好的 scaffold

- `post.md`：通用文章模板
- `draft.md`：草稿模板
- `page.md`：独立页面模板
- `note.md`：普通笔记模板
- `writeup.md`：比赛 / 逆向 / CTF 题解模板

### 最常用的写法

普通笔记：

```bash
npx hexo new note "本地全文搜索说明"
```

CTF 题解：

```bash
npx hexo new writeup "TGCTF 逆向记录"
```

### 如果你想直接生成到三级目录里

**重点：要用 `--path`，不要只在标题里写斜杠。**

我已经实测过：

- 只写标题里的斜杠，例如 `"2026/guides/search/test"`，Hexo 会把它变成扁平文件名
- 真正要生成到目录里，应该用 `--path`

正确示例：

```bash
npx hexo new note "搜索说明" --path 2026/guides/search/local-search-notes.md
```

```bash
npx hexo new writeup "蓝桥逆向" --path 2025/ctf/re/lanqiao-re.md
```

这会直接创建：

```text
source/_posts/2026/guides/search/local-search-notes.md
source/_posts/2025/ctf/re/lanqiao-re.md
```

### 如果你想修改默认 Markdown 模板

直接编辑对应的 scaffold 文件即可，例如：

- 改通用文章模板：`scaffolds/post.md`
- 改题解模板：`scaffolds/writeup.md`
- 改普通笔记模板：`scaffolds/note.md`

你以后每次执行 `hexo new ...` 时，Hexo 都会自动使用新的模板。

## Front Matter 常用字段说明

当前这套站点最常用的是这些字段：

```yml
---
title: "文章标题"
date: 2026-04-06 10:00:00
updated: 2026-04-06 10:00:00
excerpt: "首页摘要"
description: "更完整一点的描述，可选"
cover: "/uploads/backgrounds/example-cover.jpg"
top_img: "/uploads/backgrounds/example-top.jpg"
tags:
  - reverse
  - competition
sticky: 10
---
```

各字段作用：

- `title`：文章标题
- `date`：创建时间
- `updated`：更新时间
- `excerpt`：列表页 / 搜索摘要优先来源，建议保留
- `description`：补充描述，可选
- `cover`：博客列表卡片封面
- `top_img`：文章页顶部头图
- `tags`：标签
- `sticky`：置顶等级，数字越大越靠前

### `excerpt` 到底有什么用

它不是摆设，当前站点里会用于：

- `/blog/` 列表页文章摘要
- 本地搜索索引中的摘要字段
- 主题需要简介时的优先文本来源

如果不写 `excerpt`，主题就会退回去截正文前几句，所以推荐一直写。

## 图片导入与 WebP 优化

现在这套仓库已经支持“导入图片 + 自动压缩”一条龙：

支持的 Markdown 图片来源：

- 普通 Markdown：`![](image.png)`
- Obsidian：`![[Pasted image.png]]`
- HTML：`<img src="image.png">`
- 语雀 / 远程图：`https://...png`
- 站内绝对路径：`/uploads/backgrounds/example.jpg`

### 当前图片管线会做什么

1. **本地图片**：自动寻找并复制到站点里
2. **远程图片**：第一次构建时自动下载并缓存
3. **JPEG / PNG / BMP / TIFF**：自动转成 `WebP`
4. **GIF / SVG / APNG / WEBP / AVIF**：直接透传，不强转
5. **文章封面与头图**：`cover` / `top_img` 也会自动尝试转成优化格式
6. **主题默认头图**：`default_top_img` / `index_img` / `archive_img` / `tag_img` 也会自动尝试转成优化格式

### 图片最终会放在哪里

导入型图片通常会进入：

```text
source/uploads/imported/
```

例如：

```text
source/uploads/imported/2025/ctf/re/蓝桥杯两道逆向/...
```

背景图和封面图原图仍然建议放在：

```text
source/uploads/backgrounds/
```

构建时如果可优化，会在同目录旁边自动生成 `.webp`。

### 图片优化配置在哪里

看根目录：

- `_config.yml`

当前配置块：

```yml
image_pipeline:
  enabled: true
  format: webp
  webp_quality: 82
  avif_quality: 54
  effort: 4
  passthrough:
    - .apng
    - .avif
    - .gif
    - .svg
    - .webp
```

如果你以后想尝试 `AVIF`，把：

```yml
format: webp
```

改成：

```yml
format: avif
```

但一般来说，当前这套博客站点用 `WebP` 是更稳妥的默认方案。

## 背景图、封面图和头图怎么改

把图片放到：

```text
source/uploads/backgrounds/
```

然后：

- 文章卡片封面：改文章里的 `cover`
- 文章页头图：改文章里的 `top_img`
- 全站默认头图：改 `_config.butterfly.yml`

例如：

```yml
cover: /uploads/backgrounds/lanqiao-cover.jpg
top_img: /uploads/backgrounds/lanqiao-top.jpg
```

## 代码字体

现在代码区域已经改成优先使用：

- `JetBrains Mono`

如果系统里没有，再回退到：

- `Cascadia Code`
- `IBM Plex Mono`
- `SFMono-Regular`
- `Consolas`

对应配置在：

- `_config.butterfly.yml`
- `source/css/custom.css`

## 首页和 about 页面怎么改

常改的几个文件：

- 根首页落地页：`source/index.html`
- 自我介绍详情页：`source/about/index.md`
- 主页样式：`source/css/custom.css`
- 主题导航和全局头图：`_config.butterfly.yml`
- 站点名、描述、部署根路径：`_config.yml`

## Git 提交与推送

最基础的手动流程：

```bash
git status
git add .
git commit -m "更新文章"
git push origin main
```

### 一键批处理脚本

仓库根目录已经有：

- `git-publish.bat`

它会自动执行：

1. 显示当前改动
2. 运行 `npm run build`
3. 自动 `git add -A`
4. 自动 `git commit`
5. 自动 `git push origin main`

用法一：运行后再输入提交说明

```powershell
.\git-publish.bat
```

用法二：直接把提交说明传进去

```powershell
.\git-publish.bat "更新 蓝桥杯题解"
```

## GitHub Pages 部署

这个仓库已经使用 GitHub Actions 部署 Pages。

工作流文件：

- `.github/workflows/pages.yml`

正常情况下你只需要：

1. 本地提交并推送到 `main`
2. GitHub Actions 自动构建
3. Pages 自动更新

如果 Actions 失败，优先检查：

- `npm run build` 本地是否能成功
- 有没有把 `_config.yml` 或 `_config.butterfly.yml` 写坏
- 新加图片路径是否存在
- Front Matter 有没有写错缩进

## 常见问题

### 1. 为什么 `hexo new note "2026/guides/search/test"` 没有生成到子目录？

因为标题里的斜杠不会当目录处理。要用：

```bash
npx hexo new note "标题" --path 2026/guides/search/test.md
```

### 2. 为什么图片没显示？

先检查：

- 图片文件是否真的复制进仓库了
- Markdown 路径是否写对
- 是否执行了 `npm run build`
- 远程图片第一次构建时是否联网

### 3. 为什么改了 `src/ts/` 里的文件但页面没变？

因为 TypeScript 需要重新编译。执行：

```bash
npm run build
```

或者本地预览时执行：

```bash
npm run server
```

### 4. 为什么列表页摘要不对？

先检查文章 Front Matter 里的：

```yml
excerpt: "这里写摘要"
```

然后重新构建。

### 5. 如果我只是想快速发一篇文章，最推荐的流程是什么？

推荐直接这样做：

1. 生成固定模板

```bash
npx hexo new writeup "新的题解" --path 2026/ctf/re/new-writeup.md
```

2. 写正文、放图片
3. 本地预览

```bash
npm run server
```

4. 一键发布

```powershell
.\git-publish.bat "新增 2026 CTF 题解"
```

## 你以后最常用的几条命令

```bash
npm install
npm run server
npm run build
npm run typecheck
npx hexo new note "笔记标题" --path 2026/guides/search/example.md
npx hexo new writeup "题解标题" --path 2026/ctf/re/example.md
```

如果你以后想继续升级这套站点，我建议优先做：

- 把更多文章迁到 `scaffolds/writeup.md` / `scaffolds/note.md` 工作流里
- 根据需要继续细化 `src/ts/hexo/` 的脚本
- 如果哪天真要上 Astro，再单独开一个迁移分支，不要在现有主线里硬混
