# Butterfly GitHub Pages 站点使用说明

这个目录现在使用 `Hexo + Butterfly` 主题，并已经连接到 `SdTVdp.github.io`。

这份文档尽量按“刚接触 Git / Hexo 也能照着做”的思路来写。你以后忘了某一步，直接回来查这份 README 就可以。

## 1. 这个站点现在是什么结构

当前路由结构：

- `/`：个人主页 / about 落地页
- `/blog/`：博客主界面
- `/archives/`：归档页
- `/tags/`：标签页
- `/categories/`：分类页

你现在最常接触的目录和文件：

- `source/index.html`
  根首页，也就是 `/`
- `source/_posts/`
  文章主目录
- `source/uploads/backgrounds/`
  背景图目录
- `source/css/custom.css`
  主题样式覆盖
- `_config.yml`
  Hexo 站点配置
- `_config.butterfly.yml`
  Butterfly 主题配置
- `scripts/post-classification.js`
  自动把文章二级目录映射成分类
- `layout/categories.pug`
  分类页正文布局
- `layout/tags.pug`
  标签页正文布局

## 2. 先理解几个概念

如果你刚接触这些工具，先记住下面这几个词：

- `Hexo`
  把 Markdown 文章转换成静态网页的工具
- `Butterfly`
  Hexo 的主题，负责页面长什么样
- `Markdown`
  你以后写文章最常用的格式
- `Git`
  记录修改历史的工具
- `commit`
  相当于“做一次带说明的存档”
- `push`
  把本地提交上传到 GitHub

最简单理解：

1. 你改文件
2. 本地预览
3. 确认没问题后 `git commit`
4. 再 `git push`
5. GitHub Pages 自动更新网站

## 3. 第一次在这台电脑上使用

如果依赖已经装过，一般不用重复装。第一次使用时可以执行：

```bash
npm install
```

本地预览站点：

```bash
npm run server
```

浏览器打开：

```text
http://localhost:4000/
```

重新生成静态文件：

```bash
npm run build
```

清理缓存再重新生成：

```bash
npm run clean
npm run build
```

如果你发现页面显示很奇怪，优先试一次 `clean + build`。

## 4. 主页怎么改

根首页 `/` 对应这个文件：

- `source/index.html`

你可以在这里修改：

- 主页标题
- 个人简介
- 按钮链接
- 联系方式
- 首页头图

比如你现在看到的 `top_img`、标题、简介，都在这个文件里。

### 4.1 主页头图怎么改

根首页的头图优先看 `source/index.html` 里的：

```yml
top_img: /uploads/backgrounds/xxx.jpg
```

注意：

- `/` 根首页不会优先使用 `_config.butterfly.yml` 里的 `index_img`
- 因为根首页是你单独写的页面，不是 Butterfly 默认博客首页

所以如果你发现：

- `/blog/` 头图变了
- 但是 `/` 没变

大概率就是 `source/index.html` 里的 `top_img` 还没改，或者图片扩展名写错了。

## 5. 博客文章应该怎么放

现在推荐使用“两级目录”来管理文章。

推荐结构：

```text
source/_posts/
  start-here/site-map/start-here.md
  guides/organization/archive-and-tags.md
  guides/search/local-search-notes.md
  notes/daily/2026-04-04.md
  projects/logs/project-a-week-1.md
```

含义是：

- 第一级目录：大的分类
  例如 `guides`、`notes`、`projects`
- 第二级目录：更细的主题
  例如 `search`、`organization`、`daily`、`logs`

### 5.1 为什么现在推荐这种结构

因为项目里已经加了自动分类脚本：

- `scripts/post-classification.js`

它会把文章路径自动转成分类：

- `source/_posts/guides/search/my-note.md`
  会自动变成分类：
  - `guides`
  - `search`

这样你以后归档会很清楚，而且分类页会自动跟着变。

## 6. 新建文章最推荐的方式

### 6.1 直接手动建文件

比如你想写一篇搜索相关的文章，可以新建：

```text
source/_posts/guides/search/my-note.md
```

然后填入下面这个模板：

```md
---
title: 我的新文章
date: 2026-04-04 20:00:00
excerpt: 一句简短摘要，首页卡片会优先显示它。
tags:
  - guide
  - search
---

这里开始写正文。
```

### 6.2 使用 Hexo 命令创建

你也可以直接运行：

```bash
npx hexo new post guides/search/my-note
```

不过我更建议你先熟悉手动建文件，因为你会更清楚文件到底放在哪。

## 7. Front Matter 是什么

每篇 Markdown 开头这一段，叫 Front Matter：

```md
---
title: 我的新文章
date: 2026-04-04 20:00:00
excerpt: 一句简短摘要
tags:
  - guide
  - search
---
```

你最常用的字段：

- `title`
  文章标题
- `date`
  发布时间
- `excerpt`
  首页摘要
- `tags`
  标签
- `sticky`
  置顶权重
- `categories`
  手动指定分类

注意：

- 如果你不写 `categories`，系统会按目录自动生成分类
- 如果你手动写了 `categories`，就会优先用你手写的值

## 8. 置顶文章怎么写

如果你想把文章固定在博客首页顶部，在 Front Matter 里加：

```yml
sticky: 100
```

数值越大，越靠前。

例如现在的置顶导览文是：

- `source/_posts/start-here/site-map/start-here.md`

这篇文章就是专门作为博客首页说明文来用的。

建议：

- 长期说明文、导航文、索引文适合置顶
- 普通日常文章尽量不要都置顶

## 9. 分类页和标签页现在怎么工作

项目里已经补好了两个页面的自定义布局：

- `layout/categories.pug`
- `layout/tags.pug`

对应入口文件：

- `source/categories/index.md`
- `source/tags/index.md`

所以现在：

- `/categories/` 会显示分类树
- `/tags/` 会显示标签云

## 10. 背景图怎么换

先把图片放进：

```text
source/uploads/backgrounds/
```

例如：

```text
source/uploads/backgrounds/background1.jpg
source/uploads/backgrounds/background2.gif
```

然后按页面类型修改配置。

### 10.1 博客相关页面头图

改这里：

- `_config.butterfly.yml`

常见字段：

```yml
default_top_img: /uploads/backgrounds/background1.jpg
index_img: /uploads/backgrounds/background1.jpg
archive_img: /uploads/backgrounds/background1.jpg
tag_img: /uploads/backgrounds/background1.jpg
```

对应关系：

- `default_top_img`
  默认头图
- `index_img`
  `/blog/` 博客首页头图
- `archive_img`
  `/archives/` 头图
- `tag_img`
  `/tags/` 头图

### 10.2 根首页 `/` 头图

改这里：

- `source/index.html`

看这一行：

```yml
top_img: /uploads/backgrounds/background2.gif
```

如果根首页头图不变，优先检查：

1. 路径是否写对
2. 扩展名是否写对，比如 `.jpg` / `.png` / `.gif`
3. 是否运行了 `npm run build`
4. 是否已经 `git push`
5. 浏览器是否缓存了旧图

## 11. 日常最推荐工作流

以后你可以按这个顺序来：

1. 先改文章或页面
2. 执行 `npm run server` 本地看效果
3. 没问题后执行 `npm run build`
4. 查看 `git status`
5. 执行 `git add`
6. 执行 `git commit`
7. 最后执行 `git push origin main`

## 12. Git 是怎么用的

下面是最常用、最实用的一套。

### 12.1 查看当前改了什么

```bash
git status
```

你会看到几种状态：

- `M`
  文件被修改了
- `A`
  新文件
- `D`
  文件被删除了
- `??`
  Git 还没开始跟踪的新文件

### 12.2 把改动加入暂存区

把全部改动加入暂存区：

```bash
git add .
```

只加某个文件：

```bash
git add README.md
```

### 12.3 提交一次修改

```bash
git commit -m "更新 README 和文章分类结构"
```

这一步就是“做一次正式存档”。

`-m` 后面那句话叫提交说明，最好写清楚你这次干了什么。

### 12.4 上传到 GitHub

```bash
git push origin main
```

如果成功，GitHub Pages 会自动开始重新部署。

### 12.5 最常用的一整套命令

以后最常用的通常就是这四句：

```bash
git status
git add .
git commit -m "写清楚这次改了什么"
git push origin main
```

## 13. 如果你只是想“保存一下”，最短流程是什么

```bash
git add .
git commit -m "保存当前修改"
```

这只是在本地保存，不会上 GitHub。

如果你还想同步到远程，再补一条：

```bash
git push origin main
```

## 14. GitHub Pages 是怎么自动发布的

这个仓库已经配置好了 GitHub Actions 自动部署。

也就是说：

- 你本地 `git commit`
  只是本地保存
- 你 `git push origin main`
  才会把代码传到 GitHub
- GitHub 收到后会自动构建并发布网站

所以如果你发现：

- 本地看是新的
- GitHub 网页还是旧的

通常就是：

1. 还没 `git push`
2. 或者 GitHub Actions 还在跑

## 15. 我建议你平时这样命名提交信息

比如：

```bash
git commit -m "新增搜索相关文章"
git commit -m "调整主页文案和背景图"
git commit -m "整理文章分类目录"
git commit -m "更新 README 教程"
```

尽量不要总写：

```bash
git commit -m "update"
```

因为过一段时间你会完全不知道那次提交改了什么。

## 16. 常见问题排查

### 16.1 页面改了但网站没变

按这个顺序检查：

1. 你有没有保存文件
2. 有没有执行 `npm run build`
3. 有没有 `git add` + `git commit`
4. 有没有 `git push origin main`
5. GitHub Actions 是否正在部署
6. 浏览器有没有缓存旧页面

### 16.2 根首页头图没变，但 `/blog/` 头图变了

优先检查：

- `source/index.html` 里的 `top_img`

因为根首页是单独页面，不走博客首页的 `index_img`。

### 16.3 分类没出来

优先检查文章路径是不是这种格式：

```text
source/_posts/<一级分类>/<二级分类>/文章.md
```

例如：

```text
source/_posts/guides/search/my-note.md
```

如果你文章直接放在：

```text
source/_posts/my-note.md
```

那就不会自动得到两级分类。

### 16.4 图片换了但还是旧图

检查：

1. 文件名和扩展名是否写对
2. 图片是否真的放在 `source/uploads/backgrounds/`
3. 是否 `npm run build`
4. 是否 `git push`
5. 浏览器是否缓存

### 16.5 本地构建报错

先试：

```bash
npm run clean
npm run build
```

如果还是不行，再看报错里提到的是哪个文件。

## 17. 你以后最常改的文件总结

- 改主页内容：`source/index.html`
- 改主页样式：`source/css/custom.css`
- 改博客主题设置：`_config.butterfly.yml`
- 改站点基础信息：`_config.yml`
- 写文章：`source/_posts/...`
- 换背景图：`source/uploads/backgrounds/...`
- 看分类逻辑：`scripts/post-classification.js`

## 18. 一套你以后可以直接复制用的完整流程

### 写一篇新文章

```bash
npm run server
```

然后新建：

```text
source/_posts/guides/search/my-note.md
```

写完后：

```bash
npm run build
git status
git add .
git commit -m "新增搜索笔记"
git push origin main
```

### 改主页

修改：

- `source/index.html`
- 如果需要，再改 `source/css/custom.css`

然后：

```bash
npm run build
git add .
git commit -m "更新主页内容"
git push origin main
```

### 换背景图

1. 把图片放进 `source/uploads/backgrounds/`
2. 修改 `source/index.html` 或 `_config.butterfly.yml`
3. 然后执行：

```bash
npm run build
git add .
git commit -m "更新站点背景图"
git push origin main
```

---

如果你以后愿意，我还可以继续帮你把 README 再补成“命令速查表 + 常见错误案例”的版本，这样查起来会更快。
