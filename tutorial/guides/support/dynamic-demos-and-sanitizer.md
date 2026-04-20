# 动态演示与 HTML Sanitizer 技术支持文档

这份文档回答三个问题：

1. 现在这套动态 demo 是怎么在 Hexo + Butterfly + Markdown 页面里工作的
2. 它为什么能通过当前的 HTML sanitizer
3. 以后要扩展新 demo 或排查故障时，应该从哪里入手

## 1. 先说结论

这套方案**不是绕过 sanitizer，也没有削弱 sanitizer**。

实际做法是：

```text
Markdown 里只保留一个安全、静态、无行为的挂载容器
-> sanitizer 允许这个容器通过
-> 页面加载后，仓库里预先注入的 JS 扫描这个容器
-> JS 在浏览器里动态创建 textarea / button / pre 等交互 UI
-> Web Crypto API 在浏览器本地执行演示逻辑
```

所以“动态效果”出现的位置是在**浏览器运行时**，不是在 Markdown 原文里直接塞进 `<script>`、`<input>`、`<textarea>`。

## 2. 为什么 Markdown 里的挂载点能留下来

当前 sanitizer 的核心逻辑在：

```text
src/ts/hexo/html-sanitizer.ts
```

这个文件里有三条和本方案直接相关的规则。

### 2.1 `div` 本身是允许标签

`ALLOWED_TAGS` 里包含：

```text
div
section
span
p
pre
code
img
...
```

所以像下面这样的挂载点会被保留：

```html
<div class="crypto-demo" data-demo="hybrid-encryption"></div>
```

### 2.2 `class`、`id`、`data-*` 都允许

当前 sanitizer 允许：

- `class`
- `id`
- `title`
- `lang`
- `dir`
- `role`
- 所有 `data-*`
- 所有 `aria-*`

也就是说，下面这些属性都能留下来：

```html
<div
  class="crypto-demo"
  id="demo-1"
  data-demo="hybrid-encryption"
  data-adapter="template-generic"
  data-session-key-label="会话密钥"
></div>
```

这正是我们留“接口”的关键。

### 2.3 危险标签会被整块丢弃

`DROP_CONTENT_TAGS` 里包含：

```text
form
iframe
input
link
meta
object
script
select
style
textarea
```

这意味着如果你直接在 Markdown 里写：

```html
<script>alert(1)</script>
<input>
<textarea></textarea>
```

这些内容会被 sanitizer 直接丢掉。

所以现在的设计思路不是“把这些标签偷偷混进去”，而是根本**不在 Markdown 里写它们**。

## 3. 运行时到底发生了什么

当前链路可以拆成六步。

### 第一步：文章里只写挂载点

例如：

```html
<div class="crypto-demo" data-demo="asymmetric-principles" data-preset="lecture-template"></div>
```

或者：

```html
<div class="crypto-demo" data-demo="hybrid-encryption" data-adapter="rsa-oaep-aes-gcm"></div>
```

这一步只提供“插槽”，不提供交互控件。

### 第二步：Hexo 渲染 Markdown

Hexo 把 Markdown 编译成 HTML 后，会经过 `after_post_render` 过滤器，也就是当前的 sanitizer。

因为挂载点只使用了允许的标签和属性，所以它会留在最终页面里。

### 第三步：Butterfly 在页面底部注入 demo 脚本

当前注入位置在：

```text
_config.butterfly.yml
```

相关配置是：

```yml
inject:
  head:
    - <link rel="stylesheet" href="/css/demos.css">
  bottom:
    - <script data-pjax src="/js/demos/asymmetric-principles.js"></script>
    - <script data-pjax src="/js/demos/hybrid-encryption.js"></script>
    - <script data-pjax src="/js/demos/rsa-oaep-encrypt.js"></script>
    - <script data-pjax src="/js/demos/ecdsa-sign-verify.js"></script>
```

注意这里的脚本不是从 Markdown 里来，而是主题统一注入的静态资源。

## 4. 为什么 PJAX 切页后 demo 还能继续工作

Butterfly 常见场景下会使用 PJAX，所以很多页面切换并不会完整刷新整个浏览器页面。

这会带来两个问题：

1. 新页面内容插入后，原来的 `DOMContentLoaded` 不会再触发
2. 如果脚本重复执行，事件可能会重复绑定

现在每个 demo 文件都用了两层保护。

### 4.1 全局绑定 guard

示意：

```ts
const flag = "__sdtvdp_hybrid_encryption_bound__";
const runtime = window as unknown as Record<string, boolean>;

if (runtime[flag]) {
  return;
}

runtime[flag] = true;
```

作用：

- 防止同一个脚本因为 `data-pjax` 再次执行时重复注册事件监听

### 4.2 挂载点初始化 guard

示意：

```ts
if (root.dataset.ready === "1") {
  return;
}

root.dataset.ready = "1";
```

作用：

- 防止同一个 DOM 容器被重复 `innerHTML` 重建和重复绑事件

### 4.3 监听两个时机

示意：

```ts
document.addEventListener("DOMContentLoaded", bootAll);
document.addEventListener("pjax:complete", bootAll);
```

作用：

- 首次打开页面时初始化
- PJAX 切换到新页面后再次扫描并初始化新挂载点

## 5. 这套结构为什么适合 GitHub Pages

GitHub Pages 是静态托管，不能直接运行服务端脚本。

但我们的 demo 只依赖：

- 预先构建好的静态 HTML / CSS / JS
- 浏览器自带的 Web Crypto API

也就是说，真正的“动态”发生在浏览器本地，不依赖服务器运行时。

这正适合当前站点架构。

## 6. 现在有哪些可扩展接口

### 6.1 非对称原理模板

文件：

```text
src/ts/client/demos/asymmetric-principles.ts
```

接口：

- `data-demo="asymmetric-principles"`
- `data-preset="lecture-template"`
- `data-preset="rsa-lecture"`
- `data-preset="ecc-lecture"`

扩展方式：

1. 在 `PRESETS` 里复制一个 preset
2. 改标题、说明、流程步骤
3. 回到文章，把 `data-preset` 改成新名字

### 6.2 混合加密模板

文件：

```text
src/ts/client/demos/hybrid-encryption.ts
```

接口：

- `data-demo="hybrid-encryption"`
- `data-adapter="template-generic"`
- `data-adapter="rsa-oaep-aes-gcm"`

模板覆盖参数：

- `data-template-title`
- `data-asymmetric-label`
- `data-symmetric-label`
- `data-session-key-label`

扩展方式：

1. 在 `ADAPTERS` 里复制一个 adapter
2. 修改算法标签和 `run()` 逻辑
3. 回到文章，把 `data-adapter` 改成新名字

## 7. 新增一个 demo 的标准流程

### 场景 A：只是新增一个“讲解模板”

1. 在文章里新增一个挂载点
2. 在对应 TS 文件里新增 preset 或 adapter
3. 运行 `npm run build`
4. 打开文章确认挂载点已经初始化

### 场景 B：新增一个真正可运行的密码学 demo

1. 新建：

```text
src/ts/client/demos/your-demo.ts
```

2. 使用 IIFE 结构，并加上：

- 全局事件绑定 guard
- `root.dataset.ready` guard
- `DOMContentLoaded` / `pjax:complete` 监听

3. 在：

```text
_config.butterfly.yml
```

里追加脚本注入

4. 在：

```text
source/css/demos.css
```

里补样式

5. 在文章 Markdown 中只写挂载点

6. 跑：

```text
npm run typecheck
npm run build
```

## 8. 故障排查清单

### 8.1 页面上完全没有 demo

优先检查：

1. 挂载点是否真的出现在生成后的 HTML 里
2. `_config.butterfly.yml` 是否注入了对应 JS
3. `source/js/demos/*.js` 是否在编译后生成

### 8.2 页面有挂载点，但 UI 没出来

优先检查：

1. `data-demo` 名称是否和脚本里选择器一致
2. `bootAll()` 是否监听了 `DOMContentLoaded` / `pjax:complete`
3. 是否因为全局 flag 名写错，导致脚本提前 return

### 8.3 PJAX 切几次后按钮重复触发

优先检查：

1. 是否缺少全局 guard
2. 是否缺少 `root.dataset.ready`
3. 是否重复注入了同一个脚本

### 8.4 文章里写了按钮 / 输入框，但构建后消失

原因通常不是 Hexo 丢内容，而是 sanitizer 正常工作。

应改成：

```html
<div class="crypto-demo" data-demo="..."></div>
```

而不是直接把 `<input>`、`<textarea>`、`<script>` 写进 Markdown。

## 9. 关于“绕过 sanitizer”这句话的准确说法

更准确的表述应该是：

```text
没有绕过 sanitizer。
而是利用 sanitizer 允许的安全挂载点，把交互行为延后到浏览器运行时。
```

也可以把它理解成“两段式渲染”：

```text
Markdown 负责提供安全插槽
浏览器 JS 负责把插槽变成交互组件
```

## 10. 建议长期保持的约束

1. Markdown 里只放安全挂载点，不放可执行脚本
2. demo JS 都放在 `src/ts/client/demos/`
3. demo 样式统一放在 `source/css/demos.css`
4. 每个 demo 都必须有全局 guard 和 root guard
5. 新增算法时优先加 preset / adapter，不要先推翻 UI 结构

这样一来，sanitizer 继续保持严格，文章编辑体验也不会被前端细节污染。
