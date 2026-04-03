---
title: 标签与归档增强示例
date: 2026-03-28 09:30:00
excerpt: 这篇示例文章用来展示标签页概览、月份归档时间轴和非置顶文章的排序效果。
tags:
  - guide
  - tags
  - archive
---

这篇文章的主要作用是给标签页和归档页提供更明显的结构样本。

它现在位于 `source/_posts/guides/organization/archive-and-tags.md`，这个两级目录也会自动映射成文章分类。

## 现在你可以看到什么

- 标签页会显示当前标签的文章数、最近更新时间和其他高频标签
- 归档页会按月列出时间轴，并提供年份快捷入口
- 首页会把带有 `sticky` 的文章固定在顶部，其他文章继续按时间倒序流动

## 适合继续使用的 Front Matter

```yml
---
title: "示例标题"
date: 2026-03-28 09:30:00
excerpt: "一句简短摘要"
tags:
  - guide
  - archive
sticky: 5
---
```
