# 博客结构整理实施文档（审阅稿）

本文档只讨论**项目结构与工程组织**，不涉及首页文案、About 文风、个人语气、评论系统上线与否等内容层改动。

当前目标不是重构站点，而是在现有 **Hexo + Butterfly + TypeScript + 图片管线 + 本地搜索 + GitHub Pages** 基础上，做一轮低风险的结构整理，让后续的文章组织和“动态演示”接入更稳、更清晰。

## 1. 本轮范围

确认后拟执行的内容：

1. 统一文章目录命名规则，冻结后续写作路径规范。
2. 修正自动分类逻辑，使“年份”只作为存储层目录，不再成为用户侧分类。
3. 打开博客分页，避免 `/blog/` 长列表无限增长。
4. 为后续密码学动态演示预留独立脚本目录和样式入口。
5. 更新仓库内说明文档，使目录规则和实际行为一致。

本轮明确不做的内容：

1. 不改首页文案、About 页文案、个人语气。
2. 不上评论系统。
3. 不切换搜索方案。
4. 不迁移框架，不动 GitHub Actions 主流程。
5. 不在这一轮引入 ES Module 前端构建重构。

## 2. 当前仓库现状确认

### 2.1 构建链路已经稳定

当前 `package.json` 已经具备完整构建链：

```text
typecheck -> compile -> hexo clean -> hexo generate
```

这意味着后续结构调整应当尽量沿着现有链路做增量修改，而不是改建站方式。

### 2.2 文章目录已经出现命名分叉

当前 `source/_posts/` 下已经能看到这些目录：

```text
source/_posts/2025/ctfCompetition/re/
source/_posts/2026/CTF/competition/
source/_posts/2025/ctfNotes/              # 本地可见空目录
source/_posts/2026-guides-search-template-check/  # 本地可见空目录
```

问题不在“能不能用”，而在于：

1. 大小写不统一：`CTF` 与 `ctfCompetition` 并存。
2. 命名语义不统一：有的按内容域命名，有的按文章来源命名。
3. 空目录已经开始出现，说明旧规则和新规则之间存在摇摆。

这里再补一个执行层面的区分：

1. Git 默认不追踪空目录，因此这些空目录更可能是本地历史实验目录，而不是远端结构约束。
2. 真正需要迁移的是**被 Git 跟踪的文章与资源路径**。
3. 本地空目录清理应作为单独的工作区整理步骤处理，不应和仓库结构迁移混为一谈。

### 2.3 自动分类逻辑与目标结构存在偏差

当前 `src/ts/hexo/post-classification.ts` 的逻辑，会把 `_posts` 之后的前 3 段路径直接映射为分类。

以：

```text
source/_posts/2025/ctfCompetition/re/ISCC.md
```

为例，当前自动分类结果实际会是：

```text
2025 / ctfCompetition / re
```

这与目标中的“`ctf / re` 才是内容分类，年份只是存储目录”并不一致。

这个点如果不改，哪怕目录整理完成，分类页也依然会被年份占据顶层。

另外还要注意一层残留风险：

1. 当前逻辑会保护手写 `categories` 的文章，不会覆盖它们。
2. 如果旧文章 front matter 里已经写了 `2025 / ctfCompetition / re` 这类旧分类，单纯修改自动分类逻辑并不能修正这些文章。
3. 因此目录迁移前后都要额外检查一次手写 `categories`，确认没有旧分类残留。

### 2.3.1 目录迁移不等于 URL 一定安全

当前 `_config.yml` 使用的是：

```yml
permalink: posts/:slug/
```

这意味着：

1. 目录路径迁移本身通常不会直接改变 URL。
2. 但如果不同目录中的文章最终生成了相同的 `slug`，就可能发生 URL 冲突。
3. 因此本轮不能只看“目录是否整理成功”，还必须把“全站 slug 唯一性检查”作为迁移前后的验证项。

### 2.4 `/blog/` 目前未分页

当前 `_config.yml` 中：

```yml
index_generator:
  path: blog
  per_page: 0

per_page: 0
```

这会让博客列表和通用分页都处于“全量输出”状态。文章数量少时无伤大雅，但继续累积后，列表页长度、首屏载荷和滚动体验都会变差。

### 2.5 客户端交互脚本已经集中到单文件

当前 `src/ts/client/custom.ts` 约 1167 行，编译输出到 `source/js/custom.js`。

这说明：

1. 现有前端交互已经不再是零散小脚本。
2. 后续如果把密码学 demo 也继续塞进 `custom.ts`，维护成本会继续上升。
3. 现在正适合把“全站交互”和“单文章 demo”做职责拆分。

### 2.6 Markdown HTML 清洗器会移除交互控件

当前 `src/ts/hexo/html-sanitizer.ts` 明确会移除：

```text
form iframe input script select style textarea
```

因此后续动态演示不能依赖“在 Markdown 里直接写 `<script>` / `<input>` / `<textarea>` / `<button>` 全套控件”，正确做法应是：

1. Markdown 只提供安全挂载容器。
2. 浏览器端脚本再动态创建交互 UI。

### 2.7 客户端 TS 目前是“普通脚本模式”，不是模块模式

`tsconfig.client.json` 当前配置为：

```json
{
  "module": "None",
  "outDir": "source/js",
  "rootDir": "src/ts/client"
}
```

这意味着本轮不宜直接设计成一套依赖 `import/export` 的前端模块系统。  
更合适的做法是：

1. 保持 `custom.ts` 现状不动。
2. 新增多个**独立自执行** demo 脚本。
3. 继续通过主题 `inject.bottom` 以普通 `<script>` 方式加载。

这样改动最小，也最符合当前工程现实。

### 2.8 导入图片缓存已经存在“旧路径 / 新路径”双份痕迹

`source/uploads/imported/` 下已经同时存在类似：

```text
source/uploads/imported/2025/ctf/...
source/uploads/imported/2025/ctfCompetition/...
```

结合 `markdown-image-importer.ts` 当前按“文章源路径”生成导入缓存目录这一事实，可以判断：

1. 目录规范在历史上已经变动过一次。
2. 导入缓存未来如果继续迁移文章路径，还会继续产生并行目录。

所以目录整理完成后，需要把导入缓存的清理与重建作为一个单独步骤考虑，而不是放任其继续堆积。

## 3. 目标结构

### 3.1 文章主目录规范

确认后统一采用：

```text
source/_posts/
  <year>/
    ctf/
      re/
      crypto/
      pwn/
      misc/
      event-review/
    crypto/
      public-key/
      symmetric/
      hash/
    ai-security/
      video-detection/
    homelab/
      router/
      nas/
    guides/
      organization/
      search/
```

说明：

1. `year` 只承担归档和存储作用。
2. 一级内容域使用小写 kebab-case，避免 `CTF` / `ctfCompetition` / `ctfNotes` 并存。
3. 二级目录代表稳定主题，不再混入“比赛名”“阶段名”“随手命名”。
4. 文档负责声明“允许的目录结构”；仓库里只保留真实内容对应的目录，不为规划提交空目录或 `.gitkeep`。

### 3.2 分类映射规则

确认后希望站点自动分类改为：

```text
source/_posts/<year>/<domain>/<topic>/<file>.md
                     |------自动分类------|
```

即：

1. 跳过年份段。
2. 从 `<domain>` 开始最多取后续 3 段作为自动分类。

示例：

```text
source/_posts/2026/ctf/re/polaris-ctf.md
=> categories: ctf / re

source/_posts/2026/crypto/public-key/rsa-oaep-demo.md
=> categories: crypto / public-key
```

这一步是本轮结构整理里最关键、也最值得做的一步；否则目录整理只是“换文件夹名字”，对前台分类体验帮助有限。

### 3.3 动态演示目录规范

确认后新增：

```text
src/ts/client/
  custom.ts
  demos/
    rsa-oaep-encrypt.ts
    ecdsa-sign-verify.ts
    hybrid-encryption.ts   # 第二阶段再引入

source/css/
  custom.css
  demos.css
```

说明：

1. `custom.ts` 继续只放全站通用交互。
2. 每个 demo 用独立脚本文件。
3. `demos.css` 独立承载交互演示样式，避免 `custom.css` 持续膨胀。

## 4. 建议执行方案

### 阶段 0：先做迁移前预检

在真正改目录和脚本之前，先做三类检查：

1. `slug` 唯一性检查：
   - 枚举所有文章的 `slug` 与文件名回退值。
   - 确认在 `posts/:slug/` 规则下不会出现冲突。
2. 手写 `categories` 检查：
   - 重点搜索 `2025`、`2026`、`ctfCompetition`、`CTF` 等旧分类残留。
   - 没有特殊需求的文章，优先删掉手写 `categories`，交给路径自动分类。
   - 确实需要手写分类的文章，再按新分类体系修正。
3. 旧 imported 路径引用检查：
   - 在 `source/_posts`、`source/about`、`tutorial`、`README.md` 中搜索旧 imported 路径。
   - 在确认没有引用前，不删除任何旧缓存目录。

这一阶段只产出检查结果，不直接改内容。

### 阶段 A：先冻结目录规则

这一步不要求先批量重写所有文章内容，但要先把“以后新文章怎么放”定死。

建议规则如下：

1. 目录段统一用小写 kebab-case。
2. 年份后第一层只允许内容域，例如 `ctf`、`crypto`、`ai-security`、`homelab`、`guides`。
3. 比赛名、专题名、题目名不再进入目录层级，改由文件名、标题、标签承担。
4. 允许文章文件名保留当前习惯，不强行在本轮统一 slug，以减少 URL 震荡。

### 阶段 B：修正自动分类逻辑

目标文件：

```text
src/ts/hexo/post-classification.ts
```

建议调整为：

1. `_posts` 后第一段若匹配 `^\d{4}$`，则视为年份并跳过。
2. 从后续目录中截取最多 3 段作为分类。
3. 保持“已有手动 categories 不覆盖”的现有保护逻辑。
4. 不在这里偷偷做 `.toLowerCase()`，目录规范问题由目录迁移解决，而不是靠分类逻辑静默纠偏。

建议结果示意：

```ts
const scoped = parts.slice(postRootIndex + 1, -1);
const categoryStart = /^\d{4}$/.test(scoped[0] ?? "") ? scoped.slice(1) : scoped;
return categoryStart.filter(Boolean).slice(0, 3);
```

这一改动不会影响手写 `categories` 的文章，只会修正未手写分类时的自动行为。  
后续如果需要进一步收紧，可以再加构建 warning，用来提示不符合目录规范的 domain/topic。

### 阶段 C：整理现有文章目录

建议做一次性迁移，优先只动目录，不碰正文写法。

当前建议映射：

```text
source/_posts/2025/ctfCompetition/re/*
=> source/_posts/2025/ctf/re/*

source/_posts/2026/CTF/competition/*
=> 需要逐篇确认后迁入：
   - 若确属逆向题解，则落到 source/_posts/2026/ctf/re/*
   - 若是整场比赛综述，则落到 source/_posts/2026/ctf/event-review/*

source/_posts/2025/ctfNotes/
=> 空目录，确认后可删除

source/_posts/2026-guides-search-template-check/
=> 空目录，确认后可删除
```

本轮按下面的规则执行：

1. 具体题解优先按题型归入 `ctf/re`、`ctf/crypto`、`ctf/pwn`、`ctf/misc`。
2. 整场比赛总结、参赛记录、队伍协作复盘统一归入 `ctf/event-review`。
3. 比赛名本身交给 `tags`，不再作为长期目录分类。

### 阶段 D：打开博客分页

目标文件：

```text
_config.yml
```

建议改为：

```yml
index_generator:
  path: blog
  per_page: 8
  order_by: -date
  pagination_dir: page

per_page: 8
pagination_dir: page
```

推荐 `8` 的原因：

1. 当前本地搜索结果分页已经是 `hitsPerPage: 8`。
2. 博客列表页与搜索结果页可保持相近的信息密度。
3. 对当前文章规模足够宽松，后续也不至于太长。

### 阶段 E：为动态演示建立独立入口

目标文件与目录：

```text
src/ts/client/demos/
source/css/demos.css
_config.butterfly.yml
```

本轮建议采用**最小可行接入**：

1. 每个 demo 一个独立 `.ts` 文件。
2. 每个 demo 文件都是独立 IIFE，自行监听 `DOMContentLoaded` 和 `pjax:complete`。
3. Markdown 中只写挂载容器，例如：

```html
<div class="crypto-demo" data-demo="rsa-oaep-encrypt"></div>
```

4. `_config.butterfly.yml` 中通过 `inject.bottom` 继续添加普通脚本：

```yml
inject:
  head:
    - <link rel="stylesheet" href="/css/custom.css">
    - <link rel="stylesheet" href="/css/demos.css">
  bottom:
    - <script data-pjax src="/js/custom.js"></script>
    - <script data-pjax src="/js/demos/rsa-oaep-encrypt.js"></script>
```

另外要把“事件绑定去重”写成明确要求，而不是实现细节自选：

1. 每个 demo 文件都应有全局 guard，避免重复绑定 `DOMContentLoaded` / `pjax:complete`。
2. 每个挂载点都应有 `root.dataset.ready` 之类的局部 guard，避免同一容器重复初始化。

建议模式示意：

```ts
(() => {
  const flag = "__sdtvdp_rsa_oaep_demo_bound__";
  const runtime = window as unknown as Record<string, boolean>;

  if (runtime[flag]) {
    return;
  }

  runtime[flag] = true;

  function boot(root: HTMLElement): void {
    if (root.dataset.ready === "1") return;
    root.dataset.ready = "1";
    // init...
  }
})();
```

这两层保护解决的是不同问题：

1. 全局 guard 防止事件监听被反复绑定。
2. 局部 guard 防止同一个 demo 容器被重复初始化。

### 为什么本轮不直接上 `demo-loader` 或 Hexo Tag

因为当前客户端构建并不是模块系统，直接把 demo 平台做复杂，收益不高。

更稳的顺序是：

1. 先跑通一个或两个 demo。
2. 确认文章里确实会长期使用这套能力。
3. 再决定要不要在第二阶段补：
   - `src/ts/hexo/demo-tag.ts`
   - `scripts/demo-tag.js`
   - `{% demo xxx %}` 自定义标签

也就是说：

1. **第一阶段**只做“独立 demo 文件 + 安全挂载容器”。
2. **第二阶段**再决定是否把写法升级成 Hexo Tag。

这个顺序更稳。

### 阶段 F：导入图片缓存清理

这一步建议放在目录迁移完成之后。

原因：

1. 当前导入缓存目录受文章源路径影响。
2. 如果先清理再迁移，构建后还会再生成一轮新目录。
3. 先完成文章路径定版，再清理缓存更合理。

建议处理方式：

1. 先迁移文章目录。
2. 运行一次完整构建，确认新路径下的文章能正确生成导入缓存。
3. 用 `rg` / `grep` 再检查一次仓库里是否还引用旧 imported 路径。
4. 再清理 `source/uploads/imported/` 中不再对应任何文章源路径的旧缓存目录。

这一步属于可回收生成资产整理，执行时需要单独确认。

## 5. 文件级改动清单

确认后预计会碰到这些文件：

| 路径 | 动作 | 目的 |
| --- | --- | --- |
| `src/ts/hexo/post-classification.ts` | 修改 | 自动分类跳过年份目录 |
| `_config.yml` | 修改 | 打开博客分页 |
| `_config.butterfly.yml` | 修改 | 注入 demo 脚本与样式 |
| `src/ts/client/demos/rsa-oaep-encrypt.ts` | 新增 | RSA-OAEP 加密/解密 demo |
| `src/ts/client/demos/ecdsa-sign-verify.ts` | 新增 | ECDSA 签名/验签 demo |
| `source/css/demos.css` | 新增 | demo 公共样式 |
| `source/_posts/...` | 迁移 | 统一内容目录 |
| `README.md` | 修改 | 更新目录规范与分类说明 |
| `tutorial/start-here.md` | 修改 | 更新写作路径说明 |
| `tutorial/guides/organization/archive-and-tags.md` | 视情况修改 | 若示例路径与新规则冲突则同步 |

本轮预计不需要修改的文件：

| 路径 | 原因 |
| --- | --- |
| `package.json` | 构建命令已足够 |
| `tsconfig.client.json` | 本轮继续使用普通脚本编译模式 |
| `.github/workflows/pages.yml` | 部署流程已覆盖构建需求 |
| `src/ts/client/custom.ts` | 暂不拆分旧逻辑，只新增 demo 子目录 |

## 6. 验证标准

确认后执行时，至少应满足以下检查项：

1. `npm run typecheck` 通过。
2. `npm run build` 通过。
3. `/blog/` 出现分页，分页链接正常。
4. 分类页不再把 `2025`、`2026` 作为主要内容分类入口。
5. 所有文章 `slug` 在全站范围内唯一，不发生 `posts/:slug/` 冲突。
6. 所有文章 front matter 中没有遗留旧分类：`2025`、`2026`、`ctfCompetition`、`CTF`。
7. 旧文章迁移后，原文图片仍能显示。
8. 仓库搜索确认没有文章继续引用旧 imported 图片路径。
9. 动态 demo 页面在首次加载和 PJAX 切换后都能正常初始化。
10. 多次 PJAX 切换后 demo 不会重复绑定事件。
11. GitHub Actions 不需要新增步骤即可继续部署。

## 7. 风险与注意事项

### 7.1 目录迁移可能引发 `slug` 冲突

由于当前站点使用 `posts/:slug/` 作为 permalink 规则：

1. 目录改名不一定改 URL。
2. 真正的风险在于不同文章最终生成了相同的 `slug`。
3. 所以迁移前后必须把 `slug` 唯一性检查作为硬性步骤，而不是“顺手看看”。

### 7.2 历史文章迁移会影响导入图片缓存目录

这不会直接导致文章丢失，但会造成缓存路径变动和旧目录遗留。  
因此执行时必须把“目录迁移”和“缓存清理”拆开。

### 7.3 自动分类逻辑调整不会修正手写旧分类

自动分类逻辑修改后：

1. 未手写 `categories` 的文章会按新规则生效。
2. 已手写 `categories` 的文章仍会保留旧值。
3. 因此必须配套检查手写分类，否则分类页仍可能残留旧体系。

### 7.4 客户端脚本仍是非模块模式

本轮如果强行引入共享工具文件和 `import/export`，会把改动面一下放大到构建系统。  
因此第一阶段 demo 脚本应保持独立自执行，不做前端模块化重构。

## 8. 建议延期的事项

这些建议有价值，但我建议放到结构整理之后再谈：

1. 首页第一屏导航文案重写。
2. About 页气质与文风收束。
3. Scaffold 模板统一加入 `TL;DR / 前置知识 / 常见坑` 块。
4. `card_post_series` 开启与系列文章元数据设计。
5. Giscus 评论系统。
6. Hexo 自定义 `{% demo %}` 标签。
7. `hybrid-encryption` 作为第二阶段 demo，再连接 RSA-OAEP 与 AES-GCM 的教学链路。

## 9. 本轮已确认的决策

本轮按以下决策执行，不再作为待确认项悬空：

1. 自动分类改为“跳过年份目录”。
2. 历史 CTF 具体题解统一迁入 `source/_posts/<year>/ctf/re/` 或对应题型目录。
3. `competition` 不作为长期合法主题目录保留；整场比赛复盘统一使用 `event-review`。
4. 第一批动态演示只先上两个，但命名改为：
   - `rsa-oaep-encrypt`
   - `ecdsa-sign-verify`
5. RSA demo 要明确提示其适用于短消息教学演示，真实系统通常使用混合加密。

## 10. 建议执行顺序

确认后建议严格按这个顺序落地：

1. 先做 `slug` 唯一性检查与手写 `categories` 检查。
2. 修改 `post-classification.ts`，让自动分类跳过年份。
3. 修改 `_config.yml`，打开 `/blog/` 分页。
4. 迁移 `_posts` 目录。
5. 用 `rg` / `grep` 检查旧分类名和旧 imported 图片路径。
6. 新增 `src/ts/client/demos/` 与 `source/css/demos.css`。
7. 新增 `rsa-oaep-encrypt.ts` 与 `ecdsa-sign-verify.ts`。
8. 修改 `_config.butterfly.yml` 注入 `demos.css` 和 demo JS。
9. 更新 `README.md`、`tutorial/start-here.md`、`archive-and-tags.md`。
10. 运行 `npm run typecheck`。
11. 运行 `npm run build`。
12. 本地预览 `/blog/`、`/categories/` 与两篇 demo 页面。
13. 构建确认后，再清理 `source/uploads/imported/` 旧缓存。

这个顺序的好处是：先把信息架构和风险排查做扎实，再接入演示交互，最后才回收旧缓存，整体更稳。
