# Butterfly GitHub Pages 站点

这个目录现在使用 Hexo + Butterfly 主题，并已经连到 `SdTVdp.github.io`。

当前路由结构：

- `/`：主页落地页
- `/about/`：详细自我介绍页
- `/blog/`：博客主界面

## 目录说明

- `source/_posts/`：后续维护 Markdown 文档的主目录
- `source/uploads/backgrounds/`：背景图存放目录
- `source/uploads/imported/`：自动缓存导入图片的目录
- `source/css/custom.css`：对 Butterfly 的配色、字体和卡片样式覆盖
- `source/js/custom.js`：点击粒子和取色逻辑
- `_config.yml`：Hexo 站点配置
- `_config.butterfly.yml`：Butterfly 主题配置
- `.github/workflows/pages.yml`：GitHub Pages 自动构建与部署

## 本地使用

安装依赖：

```bash
npm install
```

本地预览：

```bash
npm run server
```

重新生成静态文件：

```bash
npm run build
```

## 新增 Markdown 文档

文章主目录仍然是 `source/_posts/`，但现在推荐按“三层目录”来放，方便年份归档、分类页和长期维护。

推荐结构：

```text
source/_posts/
  2025/ctf/re/蓝桥杯两道逆向.md
  2025/ctf/re/2025_TGCTF.md
  2026/guides/search/local-search-notes.md
  2026/start-here/site-map/start-here.md
```

这样做的效果是：

- 第一级目录表示年份，例如 `2025`、`2026`
- 第二级目录表示大的内容分区，例如 `ctf`、`guides`
- 第三级目录表示更细的主题，例如 `re`、`search`
- 如果你没有手动写 `categories`，站点会自动把这三级目录映射成文章分类

新文章可以直接照这个模板写：

```md
---
title: "新的文档"
date: 2026-04-03 12:00:00
excerpt: "首页摘要"
tags:
  - dev
  - notes
---

这里开始写正文。
```

如果你想把文章固定在首页顶部，可以继续写：

```md
sticky: 10
```

当前项目会自动把 `sticky` 映射给 Butterfly 的首页置顶排序。

## `excerpt` 是做什么的

`excerpt` 可以理解成“文章摘要”。它在你现在这套站点里至少有这几个用途：

- 作为首页和列表页更短的说明文字来源
- 作为本地搜索索引里的摘要字段
- 当主题需要生成文章简介时，优先用它而不是直接截正文

如果你不写 `excerpt`，主题通常会退回去截正文前几句；能用，但往往不够精确。

最推荐的写法是：

- 用 1 句话概括这篇文章讲什么
- 尽量控制在 30 到 80 个字
- 不要直接复制标题

例如：

```yml
excerpt: "TGCTF 与 HZNUCTF 部分逆向题记录，包含 base64、Unity、z3 和 XTEA 题目。"
```

## 导入带图片的 Markdown

现在可以直接把带图片的 Markdown 放进 `source/_posts/<年份>/<一级目录>/<二级目录>/` 里，Hexo 会在构建时自动处理常见图片写法。

当前支持：

- 普通 Markdown 图片：`![](image.png)`、`![](./assets/demo.jpg)`
- Obsidian 图片语法：`![[Pasted image 1.png]]`
- HTML 图片：`<img src="image.png">`
- 远程图片：例如语雀导出的 `https://...png`

自动处理规则：

- 本地图片会优先按文章所在目录、文章同名资源目录去找
- 如果还是没找到，会继续在整个 `source/` 目录里按文件名查找
- 远程图片会在第一次构建时自动下载并缓存
- 处理后的图片会统一放到 `source/uploads/imported/` 下面
- 这些导入后的图片会在站点里以 `/uploads/imported/...` 的形式发布

你以后从 Obsidian 或语雀迁移文章时，建议这样做：

1. 把 Markdown 文件放到 `source/_posts/<年份>/<一级目录>/<二级目录>/`
2. 如果是本地图片，把图片文件夹一起复制到附近
3. 执行 `npm run build`
4. 检查 `source/uploads/imported/` 是否自动出现了对应图片
5. `git add .`、`git commit`、`git push`

注意：

- 如果是语雀远程图，第一次构建时需要联网，成功后图片会缓存到仓库里
- 如果 Obsidian 图片文件根本没有复制进这个项目，Hexo 当然也没法替你凭空找出来
- 最稳妥的方式仍然是“Markdown 和图片一起复制进仓库”，这样后续构建和部署都不会依赖外部图床

## 正确添加 tag

标签直接写在文章 Front Matter 里的 `tags:` 字段，不需要单独新建文件夹，也不用去改 `/tags/` 页面。

示例：

```yml
tags:
  - reverse
  - competition
  - writeup
```

只要文章成功生成，这些标签就会自动出现在：

- `/tags/` 标签总览页
- 文章页底部的标签区域
- 侧边栏标签卡片

如果你以后想新增一个从没用过的 tag，直接在文章里写上去就行，Hexo 会自动生成对应标签页。

## 当前能力

- Butterfly 双栏博客布局
- 首页文章卡片与置顶文章显示
- 内置文章目录 TOC
- 明暗模式切换
- 本地全文搜索，数据来自 `search.json`
- 标签页、归档页、分类页
- 代码高亮与复制按钮
- 自动导入常见 Markdown 图片

## 更换背景图

1. 把图片放到 `source/uploads/backgrounds/`
2. 修改根目录 `_config.butterfly.yml` 里的相关字段，例如：

```yml
default_top_img: /uploads/backgrounds/background-placeholder.svg
index_img: /uploads/backgrounds/background-placeholder.svg
archive_img: /uploads/backgrounds/background-placeholder.svg
tag_img: /uploads/backgrounds/background-placeholder.svg
```

## GitHub Pages

这个仓库已经配置好了 GitHub Actions 自动部署。

- 用户主页仓库 `username.github.io`：保持 `_config.yml` 中 `root: /`
- 项目页仓库 `username.github.io/my-blog`：把 `url` 改成完整地址，并把 `root` 改成 `/my-blog/`

## 更改首页

主页内容主要改这几个地方就够了：

1. 改首页文案和模块内容：`source/index.html`
2. 改主页样式：`source/css/custom.css`
3. 改头像、导航、站点级配置：`_config.butterfly.yml`
4. 改站点名和全局描述：`_config.yml`
5. 改详细自我介绍页：`source/about/index.md`

改完以后这样预览和发布：

```powershell
npm run server
```

本地打开 `http://localhost:4000/` 看效果。确认没问题后再执行：

```powershell
git add .
git commit -m "Update site content"
git push origin main
```
