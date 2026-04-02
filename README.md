# Hexo GitHub Pages 站点

这个目录已经切换成 Hexo 结构，适合继续往 GitHub Pages 方向扩展。

## 目录说明

- `source/_posts/`：后续维护 Markdown 文档的主目录
- `source/uploads/backgrounds/`：背景图存放目录
- `themes/minimal-cascade/`：当前自定义主题
- `_config.yml`：Hexo 站点配置和主题覆盖配置
- `.github/workflows/pages.yml`：GitHub Pages 自动构建与部署
- `scaffolds/`：新建文章时使用的模板

## 本地使用

先安装依赖：

```bash
npm install
```

本地预览：

```bash
npm run server
```

生成静态文件：

```bash
npm run build
```

## 新增 Markdown 文档

请把新文章放到 `source/_posts/`，例如：

```md
---
title: "新的文档"
date: 2026-04-02 20:00:00
excerpt: "首页摘要"
tags:
  - dev
  - notes
---

这里开始写正文。
```

如果你想把文章固定在首页顶部，可以再加一个字段：

```md
sticky: 10
```

数值越大，排序越靠前。

## 当前增强能力

- 首页支持“置顶文章 + 最新更新”的双段式展示
- `/tags/` 提供标签导航页，单个标签页也有概览面板
- `/archives/` 提供年份入口和按月时间轴
- 浏览器端会读取本地生成的 `search-index.json` 做全文搜索，不依赖外部服务

## 更换背景图

1. 把图片放到 `source/uploads/backgrounds/`
2. 修改根目录 `_config.yml` 里的：

```yml
theme_config:
  background_image: /uploads/backgrounds/background-placeholder.svg
```

把路径替换成你的图片即可。

## GitHub Pages

这个仓库已经预留了 GitHub Actions 工作流。

如果你的仓库是用户主页仓库，例如 `username.github.io`：

- 保持 `_config.yml` 中的 `root: /`
- 把 `url:` 改成你的真实地址，例如 `https://username.github.io`

如果你的仓库是项目页仓库，例如 `username.github.io/my-blog`：

- 把 `url:` 改成 `https://username.github.io/my-blog`
- 把 `root:` 改成 `/my-blog/`
