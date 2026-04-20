# 2026-04-21 / 02 / 公私钥演示文章首版

## 本次目标

先落一篇可发布的密码学文章，把 RSA-OAEP 和 ECDSA 的交互式示例放进博客内容层。

## 本次变更

### 1. 新增文章

新增：

```text
source/_posts/2026/crypto/public-key/rsa-oaep-and-ecdsa-demos.md
```

文章首版包含：

- `TL;DR`
- 公钥加密 / 私钥解密的流程说明
- 私钥签名 / 公钥验签的流程说明
- `RSA-OAEP` 动态演示挂载点
- `ECDSA` 动态演示挂载点
- 安全边界提醒

### 2. 分类与 slug

- 分类由目录自动映射为 `crypto / public-key`
- 使用独立 slug：`rsa-oaep-and-ecdsa-demos`

## 涉及文件

- `source/_posts/2026/crypto/public-key/rsa-oaep-and-ecdsa-demos.md`

## 验证结果

- slug 唯一性检查通过
- `npm run build` 通过
- `public/posts/rsa-oaep-and-ecdsa-demos/index.html` 成功生成
- 生成后的文章页面包含 `rsa-oaep-encrypt` 和 `ecdsa-sign-verify` 两个挂载点

## 潜在风险

1. 首版文章偏重 RSA / ECDSA 实例，算法切换接口还不够通用
2. 还缺少“非对称加密原理模板”和“混合加密模板”
3. 还缺少对 sanitizer 工作方式的专项技术文档

## 回滚起点

如果只是文章内容不满意，优先回滚：

```text
source/_posts/2026/crypto/public-key/rsa-oaep-and-ecdsa-demos.md
```

不需要动到底层 demo 脚本和主题注入配置。
