# Butterfly GitHub Pages 站点

这个目录现在使用 Hexo + Butterfly 主题，并已经连到 `SdTVdp.github.io`。

当前路由结构：

- `/`：主页落地页
- `/about/`：详细自我介绍页
- `/blog/`：博客主界面

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

文章主目录仍然是 `source/_posts/`，但现在建议按“两级目录”来放，方便分类页和归档长期维护。

推荐结构：

```text
source/_posts/
  ctf/re/蓝桥杯两道逆向.md
  guides/search/local-search-notes.md
  start-here/site-map/start-here.md
```

这样做的效果是：

- 第一级目录表示大的内容分区，例如 `ctf`、`guides`
- 第二级目录表示更细的主题，例如 `re`、`search`
- 如果你没有手动写 `categories`，站点会自动把这两级目录映射成文章分类

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

如果你只把文章放在 `source/_posts/ctf_re/文章.md` 这种一级目录里，分类就只有一层，不方便后面归档。

如果你想把文章固定在首页顶部，可以继续写：

```md
sticky: 10
```

当前项目会自动把 `sticky` 映射给 Butterfly 的首页置顶排序。

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

更改首页：
主页内容主要改这 4 个地方就够了。

1. 改首页文案和模块内容  
看这个文件：[source/index.html](/D:/my%20blog/source/index.html#L1)  
这里就是 `/` 根首页本体。你现在看到的这些内容都在里面：
- 标题“你好，我是 SdTVdp。”：[source/index.html](/D:/my%20blog/source/index.html#L23)
- 主页简介：[source/index.html](/D:/my%20blog/source/index.html#L24)
- “进入博客 / 查看归档 / 浏览标签”按钮：[source/index.html](/D:/my%20blog/source/index.html#L28)
- “当前关注”“我会在这里持续记录什么”“联系我”这些区块也都在同一个文件里

2. 改主页样式  
看这个文件：[source/css/custom.css](/D:/my%20blog/source/css/custom.css#L198)  
这里控制主页的卡片、头像、按钮、标签、间距、深浅色下的视觉效果。  
如果你只是改文字，不用动它；如果你想改排版、颜色、圆角、按钮样式，就改这里。

3. 改头像、导航、站点级配置  
看这个文件：[_config.butterfly.yml](/D:/my%20blog/_config.butterfly.yml#L1)  
这里常改的是：
- 顶部导航 `menu`
- 侧边栏和站点头像 `avatar.img`
- 社交链接 `social`
- 默认头图 `default_top_img`

4. 改站点名和全局描述  
看这个文件：[_config.yml](/D:/my%20blog/_config.yml#L1)  
这里的：
- `title: Minimal Cascade`
- `description`
- `author`
会影响浏览器标题、站点名等全局信息。

最常见的几个改法：
- 改名字：把 [source/index.html](/D:/my%20blog/source/index.html#L23) 的 `你好，我是 SdTVdp。` 改成你想要的名字
- 改简介：改 [source/index.html](/D:/my%20blog/source/index.html#L24)
- 改联系方式：改 [source/index.html](/D:/my%20blog/source/index.html#L121) 和 [source/index.html](/D:/my%20blog/source/index.html#L125)
- 改头像：改 [source/index.html](/D:/my%20blog/source/index.html#L17) 和 [_config.butterfly.yml](/D:/my%20blog/_config.butterfly.yml#L24)
- 改主页头图：改 [source/index.html](/D:/my%20blog/source/index.html#L5)
  先把图片放到 `source/uploads/backgrounds/`，再写成 `/uploads/backgrounds/你的图片名.jpg`
- 改详细自我介绍页：直接改 [source/about/index.md](/D:/my%20blog/source/about/index.md#L1)

改完以后这样预览和发布：
```powershell
npm run server
```

本地打开 `http://localhost:4000/` 看效果。确认没问题后再执行：
```powershell
git add .
git commit -m "Update homepage content"
git push origin main
```

如果你愿意，我也可以直接帮你把主页文案改成你想要的版本。你只要把“名字、简介、联系方式、想展示的几个模块”发给我，我直接替你改好。
