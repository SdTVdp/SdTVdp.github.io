---
title: "公私钥算法动态演示：RSA-OAEP、ECDSA 与混合加密模板"
date: 2026-04-21 20:00:00
updated: 2026-04-21 21:30:00
slug: rsa-oaep-and-ecdsa-demos
tags:
  - crypto
  - public-key
  - rsa
  - rsa-oaep
  - ecdsa
  - webcrypto
  - hybrid-encryption
excerpt: "用浏览器端 Web Crypto API 演示 RSA-OAEP 加密、ECDSA 签名，并补上一套可切换 preset / adapter 的非对称加密与混合加密讲解模板。"
---

## TL;DR

这一页现在分成四块：

1. 一个不绑定具体算法的“非对称加密基本流程与原理”动态模板
2. 一个可运行的 `RSA-OAEP` 公钥加密 / 私钥解密 demo
3. 一个可运行的 `ECDSA` 私钥签名 / 公钥验签 demo
4. 一个可切换适配器的混合加密模板，其中已经附带 `RSA-OAEP + AES-GCM` 的可运行实例

如果老师最后确认讲别的算法，我只需要改 `data-preset`、`data-adapter`，或者在对应 TS 文件里加一个新的 preset / adapter。

## 前置知识

- 知道 `publicKey` 和 `privateKey` 是两把职责不同的钥匙
- 知道“加密”和“签名”是两条不同流程
- 知道真实系统里经常把非对称算法和对称算法组合使用

## 动态模板 0：非对称加密的基本流程与原理

这张卡是通用模板，不绑定 RSA、ECDSA 或其他具体算法，适合在课堂开头先把概念讲清楚。

<div class="crypto-demo" data-demo="asymmetric-principles" data-preset="lecture-template"></div>

### 如果要切成某个具体算法

- 讲 RSA：把 `data-preset="lecture-template"` 改成 `data-preset="rsa-lecture"`
- 讲椭圆曲线：改成 `data-preset="ecc-lecture"`
- 讲别的算法：去 `src/ts/client/demos/asymmetric-principles.ts` 里复制一个 preset，再替换文案

## 动态演示 1：RSA-OAEP 公钥加密

这部分演示的是最常见的课堂链路：

```text
Bob 生成密钥对
Alice 使用 Bob 的 publicKey 加密消息
Bob 使用自己的 privateKey 解密消息
```

这里我保留了一个真实可运行 demo，方便你现场讲“机密性”。

<div class="crypto-demo" data-demo="rsa-oaep-encrypt"></div>

### 这段 demo 适合怎么讲

- 先强调 `publicKey` 可以公开，`privateKey` 不公开
- 再强调 RSA 这里更适合演示短消息或会话密钥，不适合直接加密长正文
- 最后顺势引到后面的混合加密模板

## 动态演示 2：ECDSA 私钥签名 / 公钥验签

这部分专门用来纠正一个常见误解：签名不是“把消息用私钥反着加密”。

```text
Alice 用 privateKey 生成 signature
Bob 用 publicKey 验证 signature
如果消息被改动，验签结果会失败
```

<div class="crypto-demo" data-demo="ecdsa-sign-verify"></div>

### 这段 demo 适合怎么讲

- 先让观众看“原消息验签通过”
- 再看“篡改消息后验签失败”
- 重点落在“真实性”和“完整性”

## 动态模板 3：混合加密流程模板

真实系统里，非对称算法通常不直接处理整段正文，而是负责保护一个短小的会话密钥。

下面这张卡是通用模板，默认不绑定具体算法：

<div
  class="crypto-demo"
  data-demo="hybrid-encryption"
  data-adapter="template-generic"
  data-template-title="混合加密课堂模板"
  data-asymmetric-label="待确认公钥算法"
  data-symmetric-label="待确认对称算法"
  data-session-key-label="会话密钥"
></div>

### 通用模板里的默认流程

```text
1. 生成会话密钥
2. 用对称算法加密正文
3. 用公钥算法保护会话密钥
4. 接收方先恢复会话密钥
5. 再用对称算法解开正文
```

如果老师最后指定：

- `RSA + AES-GCM`：直接切到 `rsa-oaep-aes-gcm`
- `ECDH + AES-GCM`：新增一个 `ecdh-aes-gcm` adapter
- 其他公钥方案：继续沿用这个模板，只换 adapter 和文案

## 动态演示 4：RSA-OAEP + AES-GCM 混合加密实例

这一块是已经可以跑起来的版本，用来展示“为什么真实系统更常采用混合加密”。

<div class="crypto-demo" data-demo="hybrid-encryption" data-adapter="rsa-oaep-aes-gcm"></div>

## 以后如果要快速换算法，我该改哪里

### 1. 只想改课堂讲解逻辑，不动 UI 骨架

改这里：

```text
src/ts/client/demos/asymmetric-principles.ts
```

做法：

- 复制一个 preset
- 替换标题、流程步骤、讲解提示
- 回到文章，把 `data-preset` 改成新的 preset 名

### 2. 想换混合加密方案

改这里：

```text
src/ts/client/demos/hybrid-encryption.ts
```

做法：

- 复制一个 adapter
- 替换算法标签、运行逻辑和输出说明
- 回到文章，把 `data-adapter` 改成新的 adapter 名

### 3. 只想临时改课堂标题或标签，不想进 TS

可以直接改文章里的这些属性：

```html
data-template-title
data-asymmetric-label
data-symmetric-label
data-session-key-label
```

这套接口就是专门给“老师临时改题目，我得快速切换讲法”留的。

## 安全边界

本页所有 demo 都只用于理解概念，不代表生产级协议设计。

1. 不要在页面里输入真实密码、私钥、Token 或敏感数据
2. 真实系统应该使用成熟协议和经过审计的库，不要自己发明密码协议
3. 浏览器端 demo 适合教学、实验和直觉说明，不适合替代正式的安全设计

## 总结

现在这页既能讲具体例子，也留了足够多的“空白模板”和切换接口：

```text
非对称加密原理：asymmetric-principles preset
混合加密流程：hybrid-encryption adapter
具体 RSA 演示：rsa-oaep-encrypt
具体签名演示：ecdsa-sign-verify
```

下一次如果要切换算法，我可以直接从 preset / adapter 入口开始改，而不用重写整篇文章或重做前端结构。
