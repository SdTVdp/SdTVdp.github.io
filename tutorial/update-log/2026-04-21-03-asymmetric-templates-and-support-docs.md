# 2026-04-21 / 03 / 非对称模板、混合加密与技术支持文档

## 本次目标

补齐“老师临时改讲法”场景下最关键的弹性层：

1. 新增不绑定具体算法的非对称原理动态模板
2. 新增可切换 adapter 的混合加密模板
3. 给现有文章补上模板入口和快速切换说明
4. 明确写出 sanitizer 与动态 demo 的工作方式
5. 建立可持续追加的更新日志目录

## 本次变更

### 1. 新增非对称原理模板脚本

新增：

```text
src/ts/client/demos/asymmetric-principles.ts
```

特点：

- 使用 IIFE 结构
- 带全局事件绑定 guard
- 带 `root.dataset.ready` guard
- 同时监听 `DOMContentLoaded` 与 `pjax:complete`
- 内置 `lecture-template`、`rsa-lecture`、`ecc-lecture` 三组 preset

### 2. 新增混合加密模板脚本

新增：

```text
src/ts/client/demos/hybrid-encryption.ts
```

特点：

- 使用 adapter 结构区分不同算法组合
- 内置 `template-generic`
- 内置可运行实例 `rsa-oaep-aes-gcm`
- 为课堂临时切换保留了 `data-template-title`、`data-asymmetric-label`、`data-symmetric-label`、`data-session-key-label`

### 3. 扩展 demo 样式

修改：

```text
source/css/demos.css
```

新增内容：

- 步骤流样式
- 标签切换样式
- 双栏信息面板样式
- chip 样式
- 混合加密模板所需的稳定布局

### 4. 注入新脚本

修改：

```text
_config.butterfly.yml
```

新增注入：

- `/js/demos/asymmetric-principles.js`
- `/js/demos/hybrid-encryption.js`

### 5. 扩展文章内容

修改：

```text
source/_posts/2026/crypto/public-key/rsa-oaep-and-ecdsa-demos.md
```

新增内容：

- 非对称原理模板挂载点
- 混合加密通用模板挂载点
- `RSA-OAEP + AES-GCM` 实例挂载点
- “以后换算法时改哪里”说明

### 6. 新增技术支持文档

新增：

```text
tutorial/guides/support/dynamic-demos-and-sanitizer.md
```

重点说明：

- 这套方案不是绕过 sanitizer，而是使用允许的挂载点
- sanitizer 为什么会保留 `<div class="crypto-demo" data-demo="...">`
- 为什么会丢掉 `<script>`、`<input>`、`<textarea>`
- PJAX 下为什么不会重复绑定
- 新增 demo 时的标准工作流

### 7. 新增更新日志目录

新增：

```text
tutorial/update-log/
```

本次同时回填了本轮之前两次关键更新，方便后续排查和回滚。

## 涉及文件

- `_config.butterfly.yml`
- `source/css/demos.css`
- `src/ts/client/demos/asymmetric-principles.ts`
- `src/ts/client/demos/hybrid-encryption.ts`
- `source/_posts/2026/crypto/public-key/rsa-oaep-and-ecdsa-demos.md`
- `tutorial/guides/support/dynamic-demos-and-sanitizer.md`
- `tutorial/update-log/README.md`
- `tutorial/update-log/2026-04-21-01-structure-demo-foundation.md`
- `tutorial/update-log/2026-04-21-02-public-key-demo-article.md`
- `tutorial/update-log/2026-04-21-03-asymmetric-templates-and-support-docs.md`

## 验证计划

1. 检查 slug 是否重复
2. 运行 `npm run typecheck`
3. 运行 `npm run build`
4. 检查生成后的文章页面是否包含：
   - `data-demo="asymmetric-principles"`
   - `data-demo="hybrid-encryption"`
5. 检查生成后的脚本是否存在：
   - `source/js/demos/asymmetric-principles.js`
   - `source/js/demos/hybrid-encryption.js`

## 潜在风险

1. 如果未来新增 adapter 但忘记在 `_config.butterfly.yml` 注入脚本，页面会只有挂载点没有 UI
2. 如果文章中 `data-demo` / `data-adapter` 写错，demo 不会初始化
3. 如果课堂最后指定的算法不是现有 preset / adapter，需要先补一份配置再切换

## 回滚起点

按功能块回滚：

1. 模板不满意：先回滚 `src/ts/client/demos/asymmetric-principles.ts`
2. 混合加密不满意：先回滚 `src/ts/client/demos/hybrid-encryption.ts`
3. 页面注入异常：检查 `_config.butterfly.yml`
4. 只是文章编排问题：只回滚文章文件
5. 文档目录不满意：只回滚 `tutorial/guides/support/` 和 `tutorial/update-log/`
