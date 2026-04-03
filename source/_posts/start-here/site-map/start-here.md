---
title: 开始前先看这里
date: 2026-04-02 20:00:00
sticky: 100
excerpt: 这是一篇置顶导览文，用来说明博客的二级目录分类方式、归档约定，以及后续写作时该把文章放在哪里。
tags:
  - start
  - markdown
  - workflow
---

这篇文章是博客首页的置顶导览文。以后你可以先看这里，再决定新文章应该落到哪个目录里。

## 现在的文章目录怎么放

文章主目录仍然是 `source/_posts/`，但现在推荐使用两级目录结构：

```text
source/_posts/
  start-here/site-map/start-here.md
  guides/organization/archive-and-tags.md
  guides/search/local-search-notes.md
```

这个结构的意思是：

1. 第一级目录表示大的内容分区，例如 `start-here`、`guides`、`notes`
2. 第二级目录表示更具体的主题，例如 `site-map`、`organization`、`search`
3. 文章文件继续放在第二级目录里，方便长期归档和批量整理

如果文章没有手动写 `categories`，站点会自动把这两级目录映射成文章分类。

### 推荐的日常写法

- 先确定文章属于哪个一级目录和二级主题
- 每篇文章都写 `title`、`date`、`excerpt`
- 标签继续用于跨分类检索，分类则主要负责归档
- 代码块记得标语言，方便高亮和搜索命中

### 什么时候用置顶

- 站点说明、目录导览、写作约定适合置顶
- 长期有效的索引文也适合置顶
- 普通文章尽量不要都置顶，否则首页会失去层次

## 一个可直接复用的 Front Matter

```yml
---
title: 新文章标题
date: 2026-04-04 12:00:00
excerpt: 一句简短摘要
tags:
  - notes
  - search
---
```

如果你要长期固定在首页顶部，可以额外补一行：

```yml
sticky: 100
```

## 还可以继续怎么扩展

- 新开 `notes/daily/` 存放阶段性笔记
- 新开 `projects/logs/` 存放项目记录
- 上传资源继续放在 `source/uploads/`
- 背景图统一放在 `source/uploads/backgrounds/`
