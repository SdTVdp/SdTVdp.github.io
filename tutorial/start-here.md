---
title: 开始前先看这里
date: 2026-04-02 20:00:00
sticky: 100
excerpt: 这是一篇置顶导览文，用来说明博客的三层目录分类方式、归档约定，以及后续写作时该把文章放在哪里。
tags:
  - start
  - markdown
  - workflow
---

这篇文章是博客首页的置顶导览文。以后你可以先看这里，再决定新文章应该落到哪个目录里。

## 现在的文章目录怎么放

文章主目录仍然是 `source/_posts/`，但现在推荐使用三层目录结构：

```text
source/_posts/
  2025/ctf/re/蓝桥杯两道逆向.md
  2025/ctf/re/2025_TGCTF.md
  2026/guides/organization/archive-and-tags.md
  2026/guides/search/local-search-notes.md
  2026/ctf/event-review/polaris-ctf-review.md
  2026/start-here/site-map/start-here.md
```

这个结构的意思是：

1. 第一级目录固定写年份，例如 `2025`、`2026`
2. 第二级目录表示大的内容分区，例如 `ctf`、`guides`、`start-here`
3. 第三级目录表示更具体的主题，例如 `re`、`organization`、`search`、`event-review`、`site-map`

如果文章没有手动写 `categories`，站点会自动跳过“年份”这一层，把后面的内容目录映射成文章分类。

### 推荐的日常写法

- 先确认文章属于哪一年
- 再确定一级目录和二级主题
- 比赛名优先放进 `tags`，不要放进目录层级
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

- 新开 `2026/notes/daily/` 存放阶段性笔记
- 新开 `2026/projects/logs/` 存放项目记录
- 上传资源继续放在 `source/uploads/`
- 背景图统一放在 `source/uploads/backgrounds/`
