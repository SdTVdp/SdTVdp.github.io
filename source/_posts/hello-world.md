---
title: 欢迎来到你的 Markdown 花园
date: 2026-04-02 20:00:00
sticky: 10
excerpt: 这是默认示例文档，用来展示首页卡片、搜索、主题切换、文章置顶和代码高亮效果。
tags:
  - guide
  - markdown
  - code
---

这个页面来自 `source/_posts/hello-world.md`。以后你只需要继续往 `source/_posts/` 目录里添加新的 Markdown 文件，首页就会按卡片形式把它们展示出来。

## 你可以怎么扩展

1. 持续在 `source/_posts/` 目录里写新的笔记或文章
2. 把背景图放进 `source/uploads/backgrounds/`，然后修改根目录 `_config.butterfly.yml` 里的 `default_top_img`、`index_img` 或其他页面头图配置
3. 如果仓库名不是 `username.github.io`，记得把根目录 `_config.yml` 里的 `url` 和 `root` 改成你的项目路径
4. 如果希望文章长期固定在首页顶部，可以在 Front Matter 里写 `sticky: 10`

### 推荐的日常写法

- 先写标题和摘要，再补正文段落
- 标签尽量保持稳定，后续聚合页会更清晰
- 代码块记得标语言，方便高亮和搜索命中

### 适合持续维护的目录约定

- 文档正文放在 `source/_posts/`
- 上传资源可以放到 `source/uploads/`
- 背景图统一放在 `source/uploads/backgrounds/`

## 代码高亮示例

### 主题切换脚本

```js
const storageKey = "site-theme";
const initialTheme = localStorage.getItem(storageKey) || "light";

document.documentElement.dataset.theme = initialTheme;
```

### 配色与字体变量

```css
:root {
  --font-sans: "Aptos", "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-mono: "Cascadia Code", "JetBrains Mono", Consolas, monospace;
  --page-bg: #f6fbff;
  --page-bg-dark: #1f1e33;
}
```

## 一个适合继续写的结构

- 每篇文档都写 `title`
- 每篇文档都写 `excerpt`
- 给文档加上 `tags`
- 置顶文章可以加 `sticky`
- 保留清晰的代码块语言标记，例如 `js`、`css`、`bash`
