---
title: "公私钥算法动态演示：RSA 与 ElGamal"
date: 2026-04-21 20:00:00
updated: 2026-05-24 16:30:00
slug: rsa-elgamal-public-key-demos
tags:
  - crypto
  - public-key
  - rsa
  - elgamal
excerpt: "面向课堂展示：用 RSA 与 ElGamal 说明非对称加密基本流程，并对照实验四参数完成加密、解密和计算结果展示。"
---

## 1. 展示目标

这节课只围绕两个公钥密码体制展开：`RSA` 和 `ElGamal`。

重点不是背公式，而是看清三件事：

1. 非对称加密中，公钥和私钥承担不同职责。
2. RSA 和 ElGamal 都能完成“公钥加密、私钥解密”，但密钥结构和密文形式不同。
3. 实验四给出的参数都很小，适合手算、验证和课堂演示。

## 2. 实验任务与结果

RSA 题目参数：

```text
p = 11
q = 13
e = 7
m1 = 85
m2 = 91
给定密文 y = 123
```

RSA 计算结果：

```text
n = 143
phi(n) = 120
d = 103
m1 = 85 -> c1 = 123
m2 = 91 -> c2 = 130
y = 123 -> m = 85
```

ElGamal 题目参数：

```text
p = 509
g = 449
x = 12
k = 18
m1 = 123
m2 = 407
给定密文 y = (231, 492)
```

ElGamal 计算结果：

```text
public y = 438
c1 = 231
m1 = 123 -> cipher = (231, 483)
m2 = 407 -> cipher = (231, 394)
(231, 492) -> m = 100
```

## 3. 非对称加密基本流程图

RSA 和 ElGamal 的公式不同，但基本流程相同：接收方公开公钥，保管私钥；发送方用公钥加密；接收方用私钥解密。

<div class="public-key-flowchart" aria-label="非对称加密基本流程图">
  <section class="flow-node">
    <span class="flow-index">1</span>
    <strong>接收方生成密钥对</strong>
    <p>得到 public key 和 private key</p>
  </section>
  <span class="flow-arrow">→</span>
  <section class="flow-node">
    <span class="flow-index">2</span>
    <strong>公开公钥</strong>
    <p>发送方可以拿到 public key</p>
  </section>
  <span class="flow-arrow">→</span>
  <section class="flow-node">
    <span class="flow-index">3</span>
    <strong>公钥加密明文</strong>
    <p>message 变成 ciphertext</p>
  </section>
  <span class="flow-arrow">→</span>
  <section class="flow-node">
    <span class="flow-index">4</span>
    <strong>私钥解密密文</strong>
    <p>接收方恢复 message</p>
  </section>
</div>

这个流程图里最关键的一点是：公钥可以公开，私钥不能公开。RSA 和 ElGamal 的具体计算都不能破坏这个方向。

## 4. RSA 作业部分展示与对照

RSA 的核心是构造两个互逆的指数。

1. 选择两个素数 `p`、`q`，计算 `n=p*q`。
2. 计算 `phi(n)=(p-1)*(q-1)`。
3. 选择公钥指数 `e`，要求 `gcd(e,phi(n))=1`。
4. 计算私钥指数 `d`，使 `e*d ≡ 1 (mod phi(n))`。
5. 加密：`c = m^e mod n`。
6. 解密：`m = c^d mod n`。

代入题目参数：

```text
p = 11, q = 13
n = 143
phi(n) = 120
e = 7
d = 103
```

因为：

```text
7 * 103 = 721
721 mod 120 = 1
```

所以 `d=103`。

作业计算：

```text
85^7 mod 143 = 123
91^7 mod 143 = 130
123^103 mod 143 = 85
```

与正式 RSA 相比，这个实验版为了展示原理做了明显简化：

| 项目 | 本题实验版 RSA | 正式实现中应补上的内容 |
| --- | --- | --- |
| 参数规模 | `p=11`、`q=13`，`n=143`，可以手算 | 使用至少 2048 bit 级别的模数，由安全随机数生成大素数 |
| 加密形式 | 直接计算 `c=m^e mod n` | 不能使用裸 RSA，加密应使用 OAEP 这类安全填充 |
| 明文处理 | 明文被当成一个小整数 | 需要规范编码、分块限制，真实长消息通常交给对称加密处理 |
| 随机性 | 同一明文总是得到同一密文 | OAEP 会引入随机填充，避免确定性加密暴露信息 |
| 抗攻击能力 | 只展示数学可逆性 | 需要考虑填充攻击、选择密文攻击、侧信道攻击和密钥保护 |

也就是说，这里的 RSA 保留了最核心的陷门结构：`e` 和 `d` 在 `phi(n)` 下互逆；但牺牲了正式系统需要的参数规模、随机填充、消息编码和抗攻击设计。

如果要从实验版改进到更正式的思路，方向应该是：使用成熟密码库生成密钥，采用 `RSA-OAEP` 做短数据或会话密钥封装，再用对称加密算法处理正文。

<div class="crypto-demo" data-demo="rsa-textbook"></div>

## 5. ElGamal 作业部分展示与对照

ElGamal 建立在离散对数问题上。它和 RSA 一样属于公钥密码体制，但每次加密还需要一个随机数 `k`。

密钥生成：

```text
选择素数 p 和生成元 g
选择私钥 x
计算公钥 y = g^x mod p
公钥为 (p,g,y)，私钥为 x
```

加密：

```text
c1 = g^k mod p
c2 = m * y^k mod p
密文为 (c1,c2)
```

解密：

```text
s = c1^x mod p
m = c2 * s^{-1} mod p
```

代入题目参数：

```text
p = 509
g = 449
x = 12
y = 449^12 mod 509 = 438
k = 18
c1 = 449^18 mod 509 = 231
y^k mod p = 66
```

作业计算：

```text
m1 = 123:
c2 = 123 * 66 mod 509 = 483
cipher = (231,483)

m2 = 407:
c2 = 407 * 66 mod 509 = 394
cipher = (231,394)

given (231,492):
s = 231^12 mod 509 = 66
s^{-1} mod 509 = 54
m = 492 * 54 mod 509 = 100
```

与正式 ElGamal 相比，这个实验版也裁掉了很多安全条件：

| 项目 | 本题实验版 ElGamal | 正式实现中应补上的内容 |
| --- | --- | --- |
| 参数规模 | `p=509`，适合手算和展示 | 使用足够大的安全素数，或使用椭圆曲线群等成熟参数 |
| 群结构 | 只展示素数域和生成元 | 正式实现要明确群阶、子群选择和参数验证 |
| 随机数 `k` | 为复现实验结果固定为 `k=18` | 每次加密必须使用不可预测、不可复用的随机 `k` |
| 明文处理 | 明文直接作为模 `p` 中的整数 | 需要安全编码，把消息映射到群元素或采用混合加密结构 |
| 密文安全性 | 只展示 `(c1,c2)` 的可解密关系 | 需要认证、完整性保护，并避免选择密文攻击 |

这里最大的一处“为了展示牺牲安全性”的地方是固定 `k=18`。在正式 ElGamal 中，`k` 一旦复用，多个密文会共享同一个掩码 `y^k`，攻击者就能看出明文之间的比例关系；如果其中一个明文已知，其他同 `k` 密文就可能被解开。

因此，这个 ElGamal 实验版保留的是离散对数陷门和共享掩码思想；牺牲的是大参数、安全随机数、消息编码、认证保护和抗攻击模型。改进方向是使用成熟群参数、强随机数、一次一密的 `k`，并把 ElGamal 用作混合加密中的密钥封装或和认证机制组合使用。

<div class="crypto-demo" data-demo="elgamal-encrypt"></div>
