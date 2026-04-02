# Butterfly GitHub Pages 站点

这个目录现在使用 Hexo + Butterfly 主题，并已经连到 `SdTVdp.github.io`。

## 目录说明

- `source/_posts/`：后续维护 Markdown 文档的主目录
- `source/uploads/backgrounds/`：背景图存放目录
- `source/css/custom.css`：对 Butterfly 的配色、字体和卡片样式覆盖
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

请把新文章放到 `source/_posts/`，例如：

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

## 当前能力

- Butterfly 双栏博客布局
- 首页文章卡片与置顶文章显示
- 内置文章目录 TOC
- 明暗模式切换
- 本地全文搜索，数据来自 `search.json`
- 标签页、归档页、分类页
- 代码高亮与复制按钮

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
