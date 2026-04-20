---
title: "2026_PolarisCTF"
date: 2026-3-29 13:00:00
excerpt: "PolarisCTF逆向题目的wp，非常有幸能够领教到TokameinE师傅在shakelife这道题出题的时候针对ai解题做的小巧思，让我意识到至少现在，手解题目仍然存在意义"
slug: 2026PolarisCTF
cover: /uploads/backgrounds/PolarisCover.png
top_img: /uploads/backgrounds/PolarisTop.png
tags:
  - reverse
  - competition
---
# 1.**<font style="color:rgb(34, 34, 34);">移动的秘密</font>**
### 题目分析
题目目录里只有一个 ELF 文件 `out`，先做基础判断：

+ 程序会输出 `Enter the flag:`
+ 输入格式是 `%29s`
+ 有 `right` / `wrong`
+ 还导入了 `strlen`、`memcpy`、`ptrace` 等函数

因此可以先从主逻辑入手，重点看输入校验过程。

### 主逻辑梳理
程序大致流程如下：

1. 读取用户输入
2. 对输入做第一层“移位”校验
3. 对原始输入做第二层 `MD5` 校验
4. 两层都通过才输出 `right`

#### 第一层校验
关键汇编逻辑可以概括为：

```c
for (i = 0; i < len; i++) {
    buf[i] = input[i] >> 1;
}

for (i = 0; i < len; i++) {
    if (buf[i] != target[i]) {
        check1 = 0;
        break;
    }
}
```

也就是说，程序会把输入的每个字符右移一位，再与内置数组逐字节比较。

这正好对应题目提示里的“移位”。

#### 第二层校验
后半段逻辑会初始化一组熟悉的常量：

```latex
0123456789abcdeffedcba9876543210
```

这其实就是 `MD5` 的初始化向量。随后程序对原始输入做 `MD5`，并将结果与固定摘要比较。

因此题目的完整校验逻辑是：

```c
(input[i] >> 1) == target[i]
AND
MD5(input) == fixed_digest
```

#### “移位”该怎么处理
如果只看第一层校验，已知：

```latex
input[i] >> 1 = target[i]
```

那么逆过来时并不能唯一恢复 `input[i]`，因为最低位在右移时已经丢失了。

所以每一位都有两种可能：

```python
input[i] = target[i] << 1
input[i] = (target[i] << 1) | 1
```

也就是每个字符只有 2 选 1。

这题的关键点就在这里：

+ 不能简单把所有字节左移一位就当作答案
+ 因为最低位未知，必须结合第二层 `MD5` 才能确定唯一正确结果

#### 目标数组恢复
这里还有一个小坑：第一层比较用到的目标数组并不是直接连续存放的 29 字节，而是由两次拷贝叠出来的。

汇编里大致是这样：

1. 把 `0x3080` 处的 16 字节拷到栈上
2. 再把 `0x3090` 处的 16 字节从偏移 `+13` 的位置覆盖进去

因此最后参与比较的数组长度不是 `16 + 16 = 32`，而是：

```latex
13 + 16 = 29
```

恢复后得到的目标字节序列为：

```python
shifted = bytes.fromhex(
    "3c36313a333d3b323631183632"
    "2f192f383736303918392f181819193e"
)
```

长度刚好是 29，这也和 `%29s` 对上了。

#### 爆破思路
由于 flag 格式已知为 `xmctf{xxx}`，所以可以先固定：

+ 前 6 个字符：`xmctf{`
+ 最后 1 个字符：`}`

剩下的位置每个只有两种可能，总状态数很小，可以直接枚举。

具体步骤：

1. 先根据 `target[i]` 生成每一位的两个候选字符
2. 固定前缀 `xmctf{` 和末尾 `}`
3. 枚举所有剩余位置的最低位组合
4. 对每个候选串计算 `MD5`
5. 找到和程序内置摘要一致的那个结果

最终得到唯一答案：

```latex
xmctf{welc0me_2_polar1s_1022}
```

#### Python 解题脚本
题目目录里已经整理好了脚本：

+ `solve.py`

完整代码如下：

```python
import hashlib


def main():
    # Main 函数里有两次拷贝：
    # 1. 0x3080 的 16 字节拷到栈上 a0..af
    # 2. 0x3090 的 16 字节从 a0+13 开始覆盖到 ad..bc
    # 因此最终参与比较的并不是 32 字节拼接，而是 29 字节重叠数组。
    shifted = bytes.fromhex(
        "3c36313a333d3b323631183632"
        "2f192f383736303918392f181819193e"
    )
    md5_target = bytes.fromhex("3a22c098710019b31c328a861429d3ad")

    # 每个字符在程序中都会执行 ch >> 1，因此逆过来时每位都有两种可能：
    # (shifted[i] << 1) 或 (shifted[i] << 1) | 1
    choices = []
    for b in shifted:
        cur = []
        for x in (b << 1, (b << 1) | 1):
            if 32 <= x <= 126:
                cur.append(chr(x))
        choices.append(cur)

    fixed = {
        0: "x",
        1: "m",
        2: "c",
        3: "t",
        4: "f",
        5: "{",
        len(shifted) - 1: "}",
    }

    for idx, ch in fixed.items():
        if ch not in choices[idx]:
            raise ValueError(f"位置 {idx} 无法固定为 {ch!r}")
        choices[idx] = [ch]

    unknown = [i for i, item in enumerate(choices) if len(item) == 2]
    total = 1 << len(unknown)

    for mask in range(total):
        chars = []
        bit_idx = 0
        for item in choices:
            if len(item) == 1:
                chars.append(item[0])
            else:
                chars.append(item[(mask >> bit_idx) & 1])
                bit_idx += 1

        candidate = "".join(chars)
        if hashlib.md5(candidate.encode()).digest() == md5_target:
            print(candidate)
            return

    print("not found")


if __name__ == "__main__":
    main()
```

#### 运行结果
在题目目录执行：

```powershell
python .\solve.py
```

输出：

```latex
xmctf{welc0me_2_polar1s_1022}
```

### 总结
这题本质上是“移位造成一位信息丢失”加上“哈希去歧义”的组合题。

核心点有两个：

1. `>> 1` 逆不回唯一值，必须考虑最低位丢失后的二义性
2. 结合第二层 `MD5` 校验枚举，就能锁定唯一 flag

最终 flag：

```latex
xmctf{welc0me_2_polar1s_1022}
```

# 2. BankGuardian
目录里只有一个一阶段程序：`BankGuardian.exe`。  
表面运行效果只是打印一段“安全更新成功”的提示：

```latex
BankGuardian Security Update v2.1

[*] Initializing security components...
[*] Verifying system integrity...
[*] Applying security patch...
[+] Security update completed successfully.
```

但静态分析后可以发现，它实际上是一个 **dropper + .NET 二阶段加载器**。

最终 flag 为：

```latex
xmctf{R3fl3ct1v3_D0tN3t_1nj3ct10n_Pwn3r}
```

---

### 2 一阶段分析
#### 1. 基本信息
+ `BankGuardian.exe` 是 64 位 Windows CUI 程序。
+ 导入表很少，主体逻辑基本都在程序内部。
+ `main` 中先解码出几段用于打印的字符串，伪装成正常更新程序。

#### 2. API 哈希解析
函数 `0x140001440` 会遍历 `kernel32.dll` 导出表，并对导出名计算哈希：

```c
hash = 0x1505;
for each char c:
    hash = hash * 0x21 + c;
```

主函数里会解析出一批 API，关键的有：

+ `CreateFileA`
+ `WriteFile`
+ `CreateProcessA`
+ `WaitForSingleObject`
+ `CloseHandle`
+ `GetTempPathA`
+ `DeleteFileA`

所以它不是单纯打印信息，而是要 **落盘文件 -> 执行 -> 清理**。

#### 3. 二阶段密文
主函数中有一块长度为 `0xE400` 的密文数据，位于 RVA `0x24628`。  
密钥材料由函数 `0x140001260` 生成。

这里最容易踩坑的一点是：

+ 种子是 `0x8C6F3BB7`
+ 生成器是 MSVC 风格 LCG：

```c
state = state * 0x41C64E6D + 0x3039
```

+ **第一组 4 字节不是 seed 本身，而是 **`next(seed)`

连续生成 11 个 `uint32` 后：

+ 前 8 个 `uint32` 组成 32 字节 `key`
+ 后 3 个 `uint32` 组成 12 字节 `nonce`

之后调用的是一个标准 `ChaCha20` 风格块函数：

+ 常量为 `"expand 32-byte k"`
+ 轮函数旋转位数为 `16/12/8/7`
+ counter 从 `0` 开始

所以一阶段的二阶段解密过程就是：

```latex
ChaCha20(key, nonce, counter=0) XOR ciphertext
```

解出后立刻能得到一个以 `MZ` 开头的 PE 文件。

#### 1. 文件类型
解密得到的二阶段是一个 **.NET 程序**：

+ Assembly 名：`BankGuardianCore`
+ 带 `ConfuserEx` 混淆痕迹

其中最关键的类型是：

+ `_oGzm5MCMGO4Vr3Mm5lKqB6mpDnh`

能看到这些关键方法：

+ `GetPart2`
+ `GetPart3`
+ `GenerateFakePart2`
+ `GenerateFakePart3`
+ `RealSecret2`
+ `RealSecret3`

#### 2. 关键思路
入口函数会做两件事：

1. 反调试 / 反沙箱
2. 通过方法体热补丁，把假方法替换成真方法

同时它会生成一个 `ssnKey`。  
这里的 `ssnKey` 实际上来自 `NtAllocateVirtualMemory` / `ZwAllocateVirtualMemory` 的 syscall 序号。  
在本题样本中，实际落到的值就是：

```latex
0x18 = 24
```

#### 3. flag 的各部分
##### Part 1
二阶段里直接能搜到前缀：

```latex
xmctf{R3fl3ct1v3_
```

##### Part 2
`RealSecret2(byte ssnKey)` 会读取托管资源。  
CLR Header 里的 `Resources` 目录大小只有 `0x10`，内容是：

```latex
07 00 00 00 5C 28 6C 56 2B 6C 47 ...
```

前 4 字节是长度 `7`，后面 7 字节逐字节与 `0x18` 异或：

```latex
5C 28 6C 56 2B 6C 47
^ 18 18 18 18 18 18 18
= 44 30 74 4E 33 74 5F
```

即：

```latex
D0tN3t_
```

##### Part 3
`RealSecret3(byte ssnKey)` 的逻辑很简单：  
取一段内部字节数组，与 `ssnKey` 逐字节异或。

解出：

```latex
1nj3ct10n_
```

##### Suffix
`_VsBYyyEZbFsjoKNf29WydChhMSx()` 会在一段 shellcode 字节流中搜索标记字节 `0xC3`，然后取后面的 ASCII 串。

得到：

```latex
Pwn3r}
```

#### 4. 拼接
最终 flag：

```latex
xmctf{R3fl3ct1v3_ + D0tN3t_ + 1nj3ct10n_ + Pwn3r}
```

即：

```latex
xmctf{R3fl3ct1v3_D0tN3t_1nj3ct10n_Pwn3r}
```

---

### 4 脚本说明
`solve.py` 做了下面几件事：

1. 解析一阶段 PE
2. 取出密文并用纯 Python 版 ChaCha20 解出二阶段
3. 解析 CLR Header 的托管资源，恢复 `Part2`
4. 使用系统自带 `.NET Framework csc.exe` 临时编译一个极小反射 helper，反射读取二阶段中的私有字符串常量和内部方法，恢复前缀、`Part3` 以及尾巴
5. 拼出最终 flag

直接运行：

```powershell
python .\solve.py
```

如果想显式指定样本路径：

```powershell
python .\solve.py .\BankGuardian.exe
```

# 3.Disguise
## 1. 外层程序做了什么
`Disguise.exe` 不是直接校验 flag 的程序，它先在 `.data` 里藏了一份第二阶段 PE。

+ `0x412c10` 会从 `0x41c000` 开始读取一串 `DWORD`
+ 每个 `DWORD` 只取低字节，再和 `7` 异或
+ 长度由 `0x470000` 处的 `DWORD` 给出，值为 `0x15000`
+ 解出来的数据头是 `MZ`，说明这是一份完整 PE

提取脚本里的核心逻辑就是：

```python
size = dword_at(0x470000)
hidden[i] = (dword_at(0x41c000 + i * 4) ^ 7) & 0xff
```

## 2. 为什么运行时只看到假提示
外层样本里真正执行的是 `0x412ce0` 这个手写 PE Loader。

+ 它把隐藏 PE 手动映射到内存
+ 修复重定位和导入表
+ 然后直接跳到隐藏 PE 的入口

所以我们在控制台看到的：

+ `Please enter your flag`
+ `Wrong flag`
+ `Correct flag`

其实都来自隐藏 PE，不来自外层程序本身。

## 3. 隐藏 PE 的校验逻辑
隐藏 PE 里真正的主逻辑在 `0x415d00`：

+ 读入一串字符串
+ 长度必须是 `0x30`，也就是 48 字节
+ 然后调用 `0x4154a0`
+ 最终把结果和 `0x421018` 处的 12 个 `DWORD` 比较

目标密文为：

```plain
0802dc5c 55bb2474 821873c4 f0b1b26c
485d006e ae423c05 801c07d1 5e4e3495
5a22add9 85ec1785 0c500d52 d1f3498a
```

## 4. `0x4154a0` 本质上是什么
把解释器还原后，可以发现它并不是乱写的 VM，而是“改常量版 SM4”。

### 4.1 Key schedule
+ Key 是 `0x421000` 处的 16 字节字符串：`We1c0me_t0_xmctf`
+ FK 在 `0x422010`
+ CK 在 `0x41f030`
+ S-box 在 `0x41ec30`

Key schedule 结构和标准 SM4 一样：

```plain
K[i+4] = K[i] ^ L'( tau( K[i+1] ^ K[i+2] ^ K[i+3] ^ CK[i] ) )
L'(x) = x ^ rol13(x) ^ rol23(x)
```

只是常量表不是标准 SM4 的那一套。

### 4.2 Block encryption
每 16 字节输入会被当成 4 个大端 `DWORD`，然后做 32 轮：

```plain
X[i+4] = X[i] ^ L( tau( X[i+1] ^ X[i+2] ^ X[i+3] ^ rk[i] ) )
L(x) = x ^ rol2(x) ^ rol10(x) ^ rol18(x) ^ rol24(x)
```

最后输出顺序也是 SM4 风格：

```plain
out = [X[35], X[34], X[33], X[32]]
```

## 5. 解密目标密文
因为这是 SM4 同型结构，所以解密时只需要把 round key 反过来用即可。

把 `0x421018` 的 12 个 `DWORD` 按 4 个一组分成 3 个 block，然后逐块解密，得到：

```plain
xmctf{We1c0me_t0_the_w0r1d_0f_VM_And_PEL0ader!!}
```

## 6. 最终 flag
```plain
xmctf{We1c0me_t0_the_w0r1d_0f_VM_And_PEL0ader!!}
```

## 7. 复现方法
在 `Disguise` 目录下直接运行：

```powershell
python .\solve_disguise.py .\Disguise.exe
```

脚本会：

1. 从外层样本提取隐藏 PE
2. 自动恢复改常量版 SM4 的所有常量
3. 解密目标密文
4. 输出 flag

# 4.easyre 
## 题目关系
这两个 `exe` 不是两个独立程序，而是一组本地回环的 `client/server`：

1. `server.exe` 监听 `127.0.0.1:5566`
2. `client.exe` 负责读入 `username` 和 `serial`
3. 客户端把输入做 RC4 加密后发给服务端
4. 服务端校验后，把提示信息用 AES-CBC 加密再回给客户端

也就是说，这题本质上是一个“本地协议逆向 + 校验逻辑逆向”。

## 第一阶段：确认协议
动态跑起来以后，可以看到：

1. `client.exe` 单独运行时会卡在输入
2. `server.exe` 单独运行时会监听本地端口
3. 两个程序同时运行时，客户端会先发 `username`
4. 如果第一阶段通过，客户端会继续要求输入 `serial`

协议格式如下：

1. 客户端发包：  
`4-byte big endian length + RC4(ciphertext)`
2. 服务端回包：  
`4-byte big endian length + AES-CBC(ciphertext)`

## 第二阶段：提取密钥和常量
用 Frida 挂 `bcrypt.dll` 相关 API，可以直接拿到固定密钥材料：

1. RC4 key  
`8fb2cde193a4fe87c39dabd7e990b8c5`
2. AES key  
`91adf387c9b48aeed2a19fc7b3d985e4`
3. AES IV  
`6ec1a237589f03d4b5e70c92fa418b66`

然后结合静态分析，在 `server.exe` 的 `.rdata` 里能找到两块很关键的 32 字节常量，它们都被单字节 `0x5c` 异或过：

1. `0x140026420 ^ 0x5c -> E5D489FD91431D5438EB28F7490F9CE0`
2. `0x140026460 ^ 0x5c -> 62001be6b65779c64e67deb560164745`

## 第三阶段：还原 username
服务端第一阶段会：

1. 用 RC4 解出 `username`
2. 计算 `MD5(username)`
3. 把结果转成 32 字节十六进制串
4. 和上面的目标常量比较

也就是说目标是：

`md5(username) = e5d489fd91431d5438eb28f7490f9ce0`

这个 hash 不在常见在线库里，但用户名空间很小。用一个简单的多线程爆破程序跑 `a-z`、长度 `<= 6`，很快就能得到：

`username = ctfer`

验证：

`md5("ctfer") = e5d489fd91431d5438eb28f7490f9ce0`

## 第四阶段：还原 serial
第二阶段不像第一阶段那样再做 hash。

把第一阶段临时 patch 成已知用户名可通过后，再测试第二个 32 字节常量，可以直接发现它就是服务端要求的明文 serial：

`serial = 62001be6b65779c64e67deb560164745`

再算一下会发现：

`md5("easyre") = 62001be6b65779c64e67deb560164745`

所以：

1. `username = ctfer`
2. `serial = md5("easyre")`

## 最终结果
最终正确输入为：

1. `username: ctfer`
2. `serial: 62001be6b65779c64e67deb560164745`

原始程序验证结果：

```latex
Enter username: Server: OK: username valid, please send serial
Enter serial: Server: OK: welcome ctfer
```

## 可复现脚本
`solve.py` 直接实现了协议，不需要 `client.exe`，只要 `server.exe` 在运行即可。

依赖：

```bash
pip install pycryptodome
```

运行方法：

```bash
python solve.py --launch-server
```

或者先手动启动服务端：

```bash
server.exe
python solve.py
```

## 脚本做了什么
1. 直接连接 `127.0.0.1:5566`
2. 使用固定 RC4 key 加密 `ctfer` 并发出
3. 使用固定 AES key/IV 解密服务端第一条响应
4. 再发送 `md5("easyre")`
5. 再解密第二条响应，得到成功信息

# 5.**<font style="color:rgb(34, 34, 34);">ezFingers</font>**
## 题目信息
+ 目标：判断 `sub_8003498` 和 `sub_8000EC0` 分别对应什么函数名
+ flag 格式：`xmctf{名称1_名称2}`

最终答案：

```latex
xmctf{HAL_RCC_GetSysClockFreq_digitalWrite}
```

## 1. 样本分析
题目目录里只有一个文件：

+ `STM32F429ZI.bin`

这是一个 STM32 裸固件。前 8 个字节可以看出：

+ 初始栈指针：`0x20030000`
+ Reset Handler：`0x08000D3D`

因此可以确定镜像加载基址为：

```latex
0x08000000
```

题目给出的两个地址：

+ `sub_8003498`
+ `sub_8000EC0`

本质上就是：

+ `0x08003498`
+ `0x08000EC0`

并且都是 Thumb 函数。

## 2. 先看 sub_8003498
用 `rizin` 直接反汇编：

```powershell
rizin -n -a arm -b 16 -m 0x08000000 -e asm.cpu=cortex -q -c "s 0x08003498; af; pdf" STM32F429ZI.bin
```

关键特征如下：

### 2.1 访问 RCC 寄存器
在函数里能看到 literal：

+ `0x40023800`

这正是 STM32F4 的 `RCC` 基址。

### 2.2 出现两个非常关键的时钟常量
在 `0x08003564` 和 `0x08003568` 位置分别有：

+ `16000000`
+ `8000000`

这两个数刚好就是 STM32 HAL 常用的：

+ `HSI_VALUE = 16000000`
+ `HSE_VALUE = 8000000`

### 2.3 函数逻辑与 HAL 完全一致
函数逻辑大致是：

1. 读取 `RCC->CFGR & 0xC` 判断当前系统时钟源
2. 如果是 HSE，直接返回 `8000000`
3. 如果不是 PLL，直接返回 `16000000`
4. 如果是 PLL，则继续读取 `RCC->PLLCFGR`
5. 取出 `PLLM / PLLN / PLLP`
6. 按公式计算系统时钟频率

这正是 STM32 HAL 中 `HAL_RCC_GetSysClockFreq()` 的行为。

### 2.4 对应源码
这个函数可以和 ST 官方 HAL 对上：

+ `HAL_RCC_GetSysClockFreq()`

源码参考：

+ `stm32f4xx_hal_rcc.c`

因此：

```latex
sub_8003498 = HAL_RCC_GetSysClockFreq
```

## 3. 再看 sub_8000EC0
反汇编：

```powershell
rizin -n -a arm -b 16 -m 0x08000000 -e asm.cpu=cortex -q -c "s 0x08000ec0; af; pdf" STM32F429ZI.bin
```

关键行为如下。

### 3.1 入参像 Arduino 的逻辑引脚号
函数开头：

```z80
cmp r0, #0x5f
bhi ...
```

也就是只接受 `0..95` 范围内的值，这很像 Arduino Core 里的逻辑引脚编号。

### 3.2 查 PinName 映射表
函数从 `0x08005D4C` 取一个 `int16_t` 表项：

```z80
ldr r3, [0x08000f00]
ldrsh.w r4, [r3, r0, lsl 1]
```

这说明：

+ `r0` 是逻辑 pin 编号
+ `0x08005D4C` 是逻辑 pin 到 `PinName` 的映射表

如果取出来是 `-1`，函数直接返回，表示这个 pin 不可用。

这和 Arduino STM32 Core 中 `digitalPinToPinName(p)` 的行为一致。

### 3.3 检查这个 pin 是否已配置
随后函数调用 `0x08000F10`，第二个参数是 `0x200001B8`。

继续看 `0x08000F10`：

```z80
ubfx r3, r0, #4, #4
ldr.w r3, [r1, r3, lsl 2]
and r0, r0, #0xf
lsr.w r0, r3, r0
and r0, r0, #1
```

这是一个非常明显的“位图查询”函数：

+ 高 4 位选端口
+ 低 4 位选 pin
+ 返回这个 pin 的状态位

它和 STM32duino 里的 `is_pin_configured()` 很一致。

### 3.4 根据 PinName 取 GPIO 端口基址
函数又调用 `0x08000F64`。

这个函数内部是一个 switch，根据 `PinName` 高位返回：

+ `0x40020000`
+ `0x40020400`
+ `0x40020800`
+ ...

这些刚好是 STM32F4 的：

+ GPIOA
+ GPIOB
+ GPIOC
+ ...

所以它的作用就是：

```latex
根据 PinName 得到 GPIOx 基址
```

### 3.5 最后执行 GPIO 写电平
接着它调用 `0x0800128E`：

```z80
cbnz r2, ...
lsls r1, r1, #0x10
str r1, [r0, #0x18]
```

这个实现本质上是往 GPIO 的 `BSRR` 写数据：

+ 写低 16 位表示置位
+ 写高 16 位表示复位

这正是 `HAL_GPIO_WritePin()` 的典型写法。

因此 `sub_8000EC0` 的整体流程就是：

1. 逻辑 pin 编号转 `PinName`
2. 检查 pin 是否已配置
3. 取 GPIO 端口地址
4. 调底层 GPIO 写电平

这与 Arduino STM32 Core 中 `digitalWrite()` 完全一致。

### 3.6 对应源码
固件里还保留了明显的 STM32duino 编译路径字符串，能进一步佐证：

```latex
/home/bo/iot/os/arduino/arduino-1.8.5/portable/packages/STM32/hardware/stm32/1.3.0/cores/arduino/HardwareSerial.cpp
```

结合这一点，`sub_8000EC0` 对应的名字就是：

```latex
digitalWrite
```

源码参考：

+ `wiring_digital.c`

因此：

```latex
sub_8000EC0 = digitalWrite
```

## 4. 得到 flag
题目要求格式：

```latex
xmctf{名称1_名称2}
```

代入得到：

```latex
xmctf{HAL_RCC_GetSysClockFreq_digitalWrite}
```

## 5. 可复现脚本
题目目录中已经提供了解题脚本：

+ `solve.py`

运行方式：

```powershell
python .\solve.py
```

输出：

```latex
sub_8003498 -> HAL_RCC_GetSysClockFreq
sub_8000EC0 -> digitalWrite
flag = xmctf{HAL_RCC_GetSysClockFreq_digitalWrite}
```

如果想同时打印用于匹配的关键反汇编：

```powershell
python .\solve.py --show-disasm
```

## 6. 解题脚本原理
脚本没有依赖 IDA/Ghidra 的数据库，而是直接对裸固件做特征匹配：

### 6.1 识别 `sub_8003498`
检查以下特征：

+ `0x08003560 == 0x40023800`
+ `0x08003564 == 16000000`
+ `0x08003568 == 8000000`
+ 函数内部调用 `0x080002D0`
+ 函数内部存在 `udiv`

这些特征组合足以判断它就是 `HAL_RCC_GetSysClockFreq`。

### 6.2 识别 `sub_8000EC0`
检查以下特征：

+ `0x08000F00 == 0x08005D4C`
+ `0x08000F04 == 0x200001B8`
+ 函数内部存在 `cmp r0, #0x5f`
+ 调用了 `0x08000F10`
+ 调用了 `0x08000F64`
+ 调用了 `0x0800128E`

这个组合说明它是 STM32duino 的 `digitalWrite()` 封装。

## 7. 总结
本题的关键不是自己硬猜函数名，而是把：

+ 芯片型号
+ 外设基址
+ HAL 常量
+ Arduino Core 调用链

这些证据串起来。

最终答案：

# 6.ezLaguage
## 1. 题目现象
`attachment.exe` 运行后会在控制台提示：

```latex
Input the flag:
```

普通管道输入没有回显结果，是因为程序不是用标准 `stdin` 读数据，而是通过控制台输入事件读取。

## 2. 初步分析
样本磁盘上的 `.text` 节高熵，入口点直接反汇编是乱码，说明存在运行时解密/自修改。

但程序导入表正常，像是自写壳而不是常见压缩壳。

## 3. 运行时解密确认
启动程序后，用 `ReadProcessMemory` 读取运行态的 `.text`，与磁盘版哈希不同，确认程序会在内存中把真实代码解开。

核心做法是：

1. 启动 `attachment.exe`
2. 等待其停在输入提示
3. 从进程内存读取 `0x401000` 开始的 `.text`
4. 回填到原 PE，得到可分析的解包版

## 4. 定位校验逻辑
解包后，`"Input the flag:"` 的 xref 落在 `0x40118f` 附近，主流程会：

1. 输出提示
2. 读取输入
3. 对输入进行编码
4. 调用自写 `strcmp` 与目标串比较

动态 hook `0x4010f2`（自写字符串比较）时，可以看到比较双方分别是：

1. 我们输入经过编码后的字符串
2. 内置目标串

目标串为：

```latex
<b<@<72-*8oz*6o-o7co-s73515yk5553<w&znz9640bj&j28++8xh44
```

字符表为：

```latex
4&ne9h1<y2*$oics-75wk3a0z@6jv8>+bx
```

## 5. 动态还原编码公式
继续 hook 运行时 helper，可以看到每个输入字符都会做两次取模/除法，再去字符表里取两个字符。

设输入第 `pos` 位字符为 `c`，`pos` 从 `1` 开始，`v = ord(c)`。

编码结果为两字符：

```python
out1 = charset[(v // 17 + pos - 1) % 34]
out2 = charset[(34 - (v % 17 + pos)) % 34]
```

于是逆向也很直接。

若某一对目标字符的 1-based 下标分别为 `i1`、`i2`，则：

```python
q = (i1 - pos) % 34
r = (35 - i2 - pos) % 34
v = 17 * q + r
c = chr(v)
```

## 6. 还原 flag
把目标串按 2 个字符一组逆回去，得到：

```latex
xmctf{E_Languag3_1s_s0_Easy}
```

再次正向编码校验，可完全还原目标串，说明结果正确。

## 7. 最终 flag
```latex
xmctf{E_Languag3_1s_s0_Easy}
```

## 8. 复现脚本
仓库内已提供：

`solve.py`

运行：

```bash
python solve.py
```

输出即为最终 flag，并会自动断言正向编码结果与目标串一致。

```latex
sub_8003498 = HAL_RCC_GetSysClockFreq
sub_8000EC0 = digitalWrite
flag = xmctf{HAL_RCC_GetSysClockFreq_digitalWrite}
```

# 7.FunPyVm
## 题目信息
+ 题目名：`FunPyVm`
+ 附件核心文件：`main.exe`、`opcode.bin`
+ 题目提示：一个简单的 Python 虚拟机

最终 flag：

```latex
xmctf{F0n_And_3asyViMGa1v1eF9rY@u}
```

## 附件结构
题目目录中真正有用的是解压后的附件目录：

+ `main.exe`
+ `opcode.bin`

先看目录：

```powershell
Get-ChildItem -Force ".\attachment (1)\attachment"
```

可以看到只有这两个文件，所以思路很明确：

1. 先逆 `main.exe`
2. 找到虚拟机实现
3. 搞懂 `opcode.bin` 做了什么

## 第一步：确认 `main.exe` 是 PyInstaller
用 `PyInstaller` 自带的 `archive_viewer` 看归档表：

```powershell
python -m pip install pyinstaller
python -m PyInstaller.utils.cliutils.archive_viewer ".\attachment (1)\attachment\main.exe" -l
```

可以看到关键条目：

```latex
main
PYZ.pyz
base_library.zip
python313.dll
...
kernelVM
```

这说明程序本体是 Python 打包的，重点就是入口脚本 `main` 和模块 `kernelVM`。

## 第二步：抽出入口脚本和 `kernelVM`
入口脚本 `main` 是一个 marshal 过的 code object，可以直接反汇编：

```python
import marshal, dis
from pathlib import Path

co = marshal.loads(Path("extracted/main").read_bytes())
dis.dis(co)
```

得到的核心逻辑非常简单：

```python
import sys
import os
import bitstring
from kernelVM import CustomVM

current_dir = ...
filename = os.path.join(current_dir, "opcode.bin")
stream = bitstring.ConstBitStream(filename=filename)
bytecode = stream.tobytes()

vm = CustomVM()
vm.run(bytecode)
```

也就是说：

+ `main.exe` 只是加载 `opcode.bin`
+ 真正的 VM 在 `kernelVM.CustomVM.run`

## 第三步：还原 VM 指令语义
把 `kernelVM` 从 `PYZ.pyz` 中取出后反汇编，能还原出这套 VM 的指令。

关键指令如下：

```latex
0x10 alloc n      分配长度为 n 的数组
0x11 load i       R1 = heap[R0][i]
0x12 store i      heap[R0][i] = R1
0x13 free         释放当前块
0x20 mov x        R1 = x
0x30 add x        R1 = (R1 + x) & 0xff
0x31 xor x        R1 = (R1 ^ x) & 0xff
0x35 xorin i      heap[R0][i] ^= R1
0x40 cmp x        R1 = int(R1 == x)
0x41 jmpf n       PC += 2 + n
0x42 jz_f n       if R1 == 0: PC += 2 + n
0x43 jnz_f n      if R1 != 0: PC += 2 + n
0x50 swapm i      交换 R1 和 heap[R0][i]
0x51 swapr        交换 R0 和 R1
0x52 01           输入字符串到当前内存块
0x52 02           输出当前内存块，直到 0 截断
```

## 第四步：分析 `opcode.bin`
把 `opcode.bin` 按照 1 字节/2 字节指令反汇编，就能看出它的结构很规整：

1. 先分配两个内存块
2. 读入用户输入
3. 对 27 个字节逐个做变换
4. 与常量比较
5. 成功输出 `yes`，失败输出 `No`

核心变换是：

```latex
if input[i] != 0:
    input[i] ^= 0x55
if input[i] != 0:
    input[i] += 7 + 3*i
```

对应的目标常量为：

```python
targets = [
    0x29, 0x47, 0x39, 0x1A, 0x3F, 0x50, 0x39, 0x26, 0x40,
    0x5F, 0x61, 0x63, 0x69, 0x38, 0x52, 0x71, 0x73, 0x60,
    0x47, 0x7C, 0x69, 0x50, 0x6A, 0x73, 0x6F, 0x82, 0xBF,
]
```

逆一下：

```python
targets = [
    0x29, 0x47, 0x39, 0x1A, 0x3F, 0x50, 0x39, 0x26, 0x40,
    0x5F, 0x61, 0x63, 0x69, 0x38, 0x52, 0x71, 0x73, 0x60,
    0x47, 0x7C, 0x69, 0x50, 0x6A, 0x73, 0x6F, 0x82, 0xBF,
]

fake = []
for i, t in enumerate(targets):
    fake.append(((t - (7 + 3 * i)) & 0xff) ^ 0x55)

print(bytes(fake).decode())
```

输出：

```latex
why_you_think_this_is_true?
```

这个字符串输入后能得到 `yes`，但它是 **fake flag**。

## 第五步：为什么这是 fake
比赛里提交这个字符串会发现 flag 错误，所以说明：

+ `opcode.bin` 的确能校验通过
+ 但作者在别处还藏了真正的第二阶段

接下来就要继续看 `main.exe` 的 PyInstaller 归档里还有没有可疑内容。

## 第六步：发现隐藏的第二阶段 `ntbase.pyd`
继续枚举 `main.exe` 归档里的二进制条目，并检查文件头：

```python
from PyInstaller.archive.readers import CArchiveReader

arc = CArchiveReader(r".\attachment (1)\attachment\main.exe")
for name, _ in arc.toc.items():
    data = arc.extract(name)
    if isinstance(data, bytes) and not data.startswith((b"MZ", b"PK")):
        print(name, len(data), data[:4])
```

会发现一个非常可疑的文件：

```latex
ntbase.pyd 2390 b'\x10d\x102'
```

正常 `.pyd` 应该是 `MZ` 开头的 PE 文件，但这个文件开头直接就是 VM 指令流：

```latex
10 64 10 32 20 00 51 12 ...
```

这说明：

+ `ntbase.pyd` 不是动态库
+ 它其实是另一份隐藏的 VM 字节码
+ 真 flag 就在第二阶段里

## 第七步：分析第二阶段字节码
第二阶段依然可以用同一个 `CustomVM` 跑，因为它本质上还是同一套指令系统。

把 `ntbase.pyd` 反汇编后，会发现它比第一阶段复杂一些，但整体结构还是：

1. 读入 27 字节输入
2. 做链式异或变换
3. 再对奇偶位置分别加常量
4. 与最终常量表比较

核心关系可以整理成：

```latex
p[0] = in[0] + 10
p[i] = (in[i] + 10) ^ p[i-1]

如果 i 为偶数:
    p[i] += 16
如果 i 为奇数:
    p[i] += 49
```

第二阶段目标常量是：

```python
targets = [
    0x60, 0x9B, 0x22, 0xAC, 0x40, 0x79, 0x36, 0x80, 0x82,
    0x4A, 0x74, 0x18, 0x97, 0x25, 0xB3, 0x23, 0xA9, 0xD3,
    0x32, 0x4A, 0x86, 0x57, 0x75, 0x4A, 0x8A, 0x61, 0x5F,
]
```

逆变换：

```python
targets = [
    0x60, 0x9B, 0x22, 0xAC, 0x40, 0x79, 0x36, 0x80, 0x82,
    0x4A, 0x74, 0x18, 0x97, 0x25, 0xB3, 0x23, 0xA9, 0xD3,
    0x32, 0x4A, 0x86, 0x57, 0x75, 0x4A, 0x8A, 0x61, 0x5F,
]

p = []
for i, t in enumerate(targets):
    add = 16 if i % 2 == 0 else 49
    p.append((t - add) & 0xff)

ans = []
ans.append((p[0] - 10) & 0xff)
for i in range(1, len(p)):
    ans.append(((p[i] ^ p[i - 1]) - 10) & 0xff)

print(bytes(ans).decode())
```

得到：

```latex
F0n_And_3asyViMGa1v1eF9rY@u
```

## 第八步：验证
把这个字符串喂给第二阶段 VM，会输出 `yes`。

最终提交时按题目要求包裹：

```latex
xmctf{F0n_And_3asyViMGa1v1eF9rY@u}
```

## 一键复现脚本
我已经把一份自动求解脚本放在这里：

+ `solve_funpyvm.py`

运行方式：

```powershell
python .\solve_funpyvm.py
```

预期输出：

```latex
[*] stage1 fake flag: why_you_think_this_is_true?
[*] hidden second-stage blob size: 2390
[*] real flag: xmctf{F0n_And_3asyViMGa1v1eF9rY@u}
```

## 总结
这题的坑点不在 VM 本身，而在“**第一阶段给你一个能通过校验但不能提交的假答案**”。

真正的关键点有两个：

1. 不要在拿到一个能输出 `yes` 的字符串后立刻停止，要结合题目提交结果继续怀疑。
2. PyInstaller 归档里所有条目都要检查文件头，尤其是伪装成 `.pyd/.dll` 但并不是 `MZ` 开头的文件。

这道题最后其实是一个双层 VM：

+ 第一层：`opcode.bin`，导出 fake flag
+ 第二层：`ntbase.pyd`，导出 real flag

# 8.hajimi
## 1. 入口分析
题目目录里只有两个文件：

+ `__main__.py`
+ `challenge.pkl.zst`

先看入口 `__main__.py`：

```python
prompt = input("You: ").strip()

if len(prompt) != 16:
    print("Wrong grid.")
    raise SystemExit(1)

if any(c not in VALID_DIGITS for c in prompt):
    print("Wrong grid.")
    raise SystemExit(1)

tokens = ["BOS"] + list(prompt)
print("Psychic:", decode_output(load_model("challenge.pkl.zst").apply(tokens)))
```

能直接得到几个非常关键的结论：

1. 输入必须是 16 位。
2. 每一位只能是 `1/2/3/4`。
3. 程序把输入拆成 token，丢给一个保存在 `challenge.pkl.zst` 里的模型。
4. 返回值不是普通数值，而是模型解码后的字符串。

这说明题目本质上不是传统 ELF/PE 逆向，而是一个“把逻辑编译进 Transformer”的逆向题。

## 2. 为什么我没有去装整套 JAX/Haiku/TRACR
`__main__.py` 依赖：

+ `jax`
+ `haiku`
+ `tracr`
+ `zstandard`

其中最重的是 `jax/tracr`。但这个题没必要真的把整套环境跑起来，因为：

1. `challenge.pkl.zst` 里存的其实是一个 pickle。
2. pickle 只需要能找到对应的类名/函数名，就能把对象还原出来。
3. 真正的权重本质上就是大块 `numpy.ndarray`。

所以更稳的做法是：

1. 给 pickle 补几个最小 stub。
2. 直接把模型对象解出来。
3. 用 `numpy` 手写一份前向传播。

这样依赖只剩：

+ `numpy`
+ `zstandard`

复现命令：

```bash
python -m pip install numpy zstandard
```

建议直接在 `hajimi` 目录里运行：

```bash
cd hajimi
python solve.py
```

## 3. 解包后能看到什么
用轻量 stub 把 `challenge.pkl.zst` 解出来以后，可以读到这些关键信息：

+ `config`
+ `params`
+ `input_encoder`
+ `output_encoder`
+ `residual_labels`
+ `embed_spaces`

其中最有价值的是两点：

### 3.1 输入字符集
`input_encoder` 里能看到输入 token，包含：

+ `BOS`
+ `1`
+ `2`
+ `3`
+ `4`

这和入口检查完全一致。

### 3.2 输出字符集
输出空间只有 16 个 token：

```latex
' ', '.', 'EOS', 'G', 'W', 'a', 'c', 'd', 'e', 'g', 'i', 'n', 'o', 'p', 'r', 't'
```

这套字符其实只能拼出两句很像样的话：

+ `Wrong grid.`
+ `Grid accepted.`

也就是说，这个模型本质上就是一个“输入 16 位数字串，输出是否通过”的判题器。

## 4. 手写本地推理器
从 `config` 可以看到模型结构：

+ `num_layers = 13`
+ `num_heads = 5`
+ `key_size = 257`
+ `mlp_hidden_size = 1290`
+ `activation_function = relu`
+ `layer_norm = False`
+ `causal = False`

前向流程非常标准：

1. `token_embed + pos_embed`
2. 13 层 Transformer block
3. 每层是：
    - Multi-Head Attention
    - 残差
    - 两层 MLP + ReLU
    - 残差
4. 最后在输出子空间取 argmax，解码成字符串

我把这部分写成了可直接运行的脚本 `solve.py`。

如果只想验证某个候选串，可以直接：

```bash
cd hajimi
python solve.py --check 1234341221434321
```

会输出：

```latex
candidate = 1234341221434321
model     = Grid accepted.
```

## 5. 如何把搜索空间从 4^16 降下来
直接爆破总空间是：

```latex
4^16 = 4294967296
```

纯查模型当然也不是不能做，但完全没必要。

结合下面几个信息可以把空间大幅缩小：

1. 程序自己提示的是 `grid`。
2. 输入刚好是 16 位，很自然可以看成 `4 x 4` 网格。
3. 数字只允许 `1..4`。
4. 题目额外提示里有“南北”这类方向词，明显像棋盘/方格类谜题。

一个非常自然的约束就是：

+ 每一行都是 `1,2,3,4` 的一个排列
+ 每一列也是 `1,2,3,4` 的一个排列

这就是一个 `4 x 4` Latin square。

满足这个条件的候选只有 576 个：

```latex
24^4 -> 先枚举行排列
再筛掉列不满足排列条件的情况
最终只剩 576 个
```

这个规模已经非常舒服，完全可以逐个丢给模型检查。

## 6. 枚举结果
脚本会枚举全部 576 个候选，并用本地 `numpy` 推理器批量跑过模型。

运行：

```bash
cd hajimi
python solve.py
```

输出：

```latex
answer = 1234341221434321
flag   = xmctf{b0a0d1edc0fb5b75770a5dcbe7b0d4fb08e42fd281a94ee67b405e36056f1df1}
```

也就是说唯一通过的答案串是：

```latex
1234341221434321
```

按 `4 x 4` 写出来就是：

```latex
1234
3412
2143
4321
```

## 7. 最终提交
题目要求提交：

```latex
xmctf{sha256(16位答案串)}
```

所以最终 flag 为：

```latex
xmctf{b0a0d1edc0fb5b75770a5dcbe7b0d4fb08e42fd281a94ee67b405e36056f1df1}
```

## 8. 复现脚本说明
`solve.py` 做了三件事：

1. 给 pickle 补最小可用的 stub，避免安装整套 JAX/TRACR。
2. 用 `numpy` 重写模型前向。
3. 枚举全部 576 个 `4 x 4` Latin square，筛出唯一通过项。

核心命令：

```bash
cd hajimi
python solve.py
python solve.py --check 1234341221434321
```

## 9. 这题的关键点总结
这题真正考点不在“把神经网络当黑盒乱猜”，而在：

1. 先从入口程序判断输入格式。
2. 看出 `challenge.pkl.zst` 是可直接静态解包的模型。
3. 意识到没必要强行搭完整运行环境，可以最小化反序列化。
4. 用模型结构自己做一个本地 oracle。
5. 利用题面和输入格式，把暴力空间压到很小。

这套方法比硬装依赖、直接运行原题环境更稳，也更适合比赛时快速复现。

# 9.Hulua
## 最终答案
`xmctf{lu4t1c_r3v3rs3_ch4ll3ng3!}`

## 题目分析
目录里只有一个 64 位原生程序 `Hulua.exe`。程序运行后会先提示输入 flag，再给出对错结果。

### 1. 先定位主流程
从字符串交叉引用可以很快定位到主逻辑：

+ 打印 `Please enter the flag:`
+ 用 `fgets` 读入用户输入
+ 创建一个 Lua state
+ 把输入塞进脚本环境里的全局变量 `user_input`
+ 从 `.data` 取出一段长度为 `0x3dc` 的缓冲区，以 `"check"` 为名字交给 Lua 执行
+ 读取脚本返回值，为真就输出正确

这一步说明程序本质上是:

1. 外层 C 程序
2. 内层静态链接 Lua 5.3.6
3. 真正的校验逻辑藏在内嵌 Lua chunk 里

### 2. 提取并恢复内嵌 Lua chunk
主函数把 `.data` 的 `0x33000` 开始的 `0x3dc` 字节当作脚本载入。直接提取后，前 4 字节不是标准 Lua 头:

```latex
73 39 19 14 ...
```

而标准 Lua 5.3 bytecode 头应该是:

```latex
1B 4C 75 61 ...
```

两者异或一下可以得到:

```latex
68 75 6C 75 61 ...
```

正好是循环字符串 `hulua`。

因此这题对 Lua chunk 做的第一层处理就是:

```python
real_chunk[i] = enc_chunk[i] ^ b"hulua"[i % 5]
```

恢复后 chunk 头就是标准的:

```latex
1B 4C 75 61 53 00 19 93 0D 0A 1A 0A
```

也就是标准 Lua 5.3 预编译 chunk。

### 3. 直接按标准 Lua 反汇编会发现异常
如果把恢复后的 chunk 按标准 Lua 5.3 opcode 顺序去解释，会出现明显不可能执行的逻辑，比如:

+ `user_input == nil` 那块还能看懂
+ 但后面会出现类似“字符串乘 nil”这种不可能成立的运算

这说明题目不只是把 chunk 头异或了一下，**还改了 Lua VM 的 opcode 语义映射**。

不过 chunk 的寄存器布局、常量表、for-loop 框架都还是标准 Lua 5.3，因此可以通过“局部源码形状”反推出真实 opcode。

## opcode 还原
### 4. 先用容易识别的子函数反推 opcode
chunk 里有两个子函数。

#### 子函数 2: 十六进制字符串转字节串
常量非常明显:

+ `string`
+ `gmatch`
+ `%x+`
+ `char`
+ `tonumber`
+ `16`

对应源码很容易还原成:

```lua
local function hex_to_bytes(s)
    local out = ""
    for x in string.gmatch(s, "%x+") do
        out = out .. string.char(tonumber(x, 16))
    end
    return out
end
```

据此可以确定:

+ `op14 = JMP`
+ `op13 = CONCAT`

#### 子函数 1: 真正的加密函数
这个函数一开始会:

+ 建两个表
+ `string.byte(key, 1, -1)` 取 key 字节
+ 把一个长度 256 的表初始化成 `0..255`
+ 进行一轮典型的 RC4 KSA 交换
+ 再对输入做一轮 RC4 PRGA

再结合中间的算术与位运算，很容易得到:

+ `op21 = MOD`
+ `op18 = ADD`
+ `op27 = BXOR`
+ `op33 = LEN`
+ `op15 = EQ`

## 还原后的 Lua 逻辑
### 5. 主逻辑
主函数可以还原为:

```lua
local ok = true
local key_hex = "78 6D 63 74 66 32 30 32 36"
local target_hex = "8B 8B 77 BE 68 61 86 68 E5 63 EE 84 35 6F 58 C8 51 0F 6E 94 70 E7 26 90 B6 75 EC 28 AF 14 E2 E3"

local rc4_like = ...
local hex_to_bytes = ...

if user_input == nil then
    return false
end

if #user_input ~= 32 then
    return false
end

local key = hex_to_bytes(key_hex)
local enc = rc4_like(key, user_input)
local target = hex_to_bytes(target_hex)
return enc == target
```

### 6. 加密函数
Lua 子函数实际是一个 RC4 变体:

```lua
local function hulua_crypt(key, data)
    local S = {}
    local key_bytes = {string.byte(key, 1, -1)}
    local key_len = #key_bytes

    for i = 0, 255 do
        S[i] = i
    end

    local j = 0
    for i = 0, 255 do
        j = (j + S[i] + key_bytes[(i % key_len) + 1]) % 256
        S[j], S[i] = S[i], S[j]
    end

    local i = 0
    j = 0
    local out = {}
    local data_bytes = {string.byte(data, 1, -1)}

    for idx = 1, #data_bytes do
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[j], S[i] = S[i], S[j]
        local ks = S[(S[i] + S[j]) % 256]
        table.insert(out, string.char((data_bytes[idx] ~ ks) ~ 0x66))
    end

    return table.concat(out)
end
```

也就是:

```latex
out[i] = data[i] ^ rc4_keystream[i] ^ 0x66
```

这个过程本身是对称的，所以解密时再跑一遍同样的函数即可。

## 求解
### 7. 取出 key 和目标密文
根 proto 常量里有两个关键字符串:

```latex
key_hex    = "78 6D 63 74 66 32 30 32 36"
target_hex = "8B 8B 77 BE 68 61 86 68 E5 63 EE 84 35 6F 58 C8 51 0F 6E 94 70 E7 26 90 B6 75 EC 28 AF 14 E2 E3"
```

先转字节:

```latex
key = b"xmctf2026"
target = bytes.fromhex(...)
```

然后直接再跑一遍同样的 `hulua_crypt(key, target)`，因为它是对称的，输出就是明文 flag:

```latex
xmctf{lu4t1c_r3v3rs3_ch4ll3ng3!}
```

## 复现脚本
脚本文件: `solve.py`

功能:

1. 从 `Hulua.exe` 中提取 `.data` 里的脚本 blob
2. 用 `hulua` 循环异或恢复 Lua chunk
3. 解析根 proto 常量，拿到 `key_hex` 和 `target_hex`
4. 按还原出的 RC4 变体解密并输出 flag

运行方法:

```powershell
python .\solve.py
```

输出:

```latex
xmctf{lu4t1c_r3v3rs3_ch4ll3ng3!}
```

## 验证
用 Python 给程序喂入这个 flag，可以得到:

```latex
[+] Congratulations! The flag is correct.
```

# 10.Illusion
## 题目概览
题目目录里只有一个 `test.exe`，程序启动后会先输出：

```latex
w3lc0me to the Re w0r1d.
P1z input your flag:
```

从交互上看像是一个普通的 flag 校验题，但这题真正的坑点在于它做了两层“幻术”：

1. `main` 里存在一层非常像最终答案的 RC4 校验。
2. 程序入口处还偷偷给 `MessageBoxA` 打了 hook，真正的 flag 被藏在这层逻辑里。

## 第一层：`main` 里的假 flag
### 1. 基本格式判断
在 `main` 中可以直接看到对输入格式的限制：

+ 前 6 字节必须是 `xmctf{`
+ 最后 1 字节必须是 `}`
+ 总长度必须是 `25`

也就是说，中间可控部分长度固定为 `18` 字节。

### 2. RC4 校验
`main` 把中间 18 字节取出后，会用 key：

```latex
nev_gona_give_up
```

做一层 RC4，然后和内置密文比较：

```latex
d5 0a fb 84 0a 8f 2c e7 27 d9 56 3e f3 6c 29 ab 19 54
```

把这段密文 RC4 解密后可以得到：

```latex
nev_gona_letydown\x07
```

于是会得到一个很像答案的字符串：

```latex
xmctf{nev_gona_letydown\x07}
```

但是这个结果有两个明显问题：

+ 最后一个字节是不可见控制字符 `0x07`
+ 提交后会发现这是错的

这说明 `main` 里的这层并不是真正答案，而是题目故意放出来的“幻术”。

## 第二层：真正的逻辑在入口 hook
### 1. 程序入口做了什么
继续往入口追，会发现程序先：

+ `GetModuleHandleA("user32.dll")`
+ `GetProcAddress(..., "MessageBoxA")`
+ 用 `VirtualProtect` 改写目标地址
+ 把 `MessageBoxA` inline hook 到 `0x1400010f0`

也就是说，这题不只是 `main` 在验 flag，弹窗函数本身也被做了手脚。

### 2. hook 中的隐藏校验
hook 函数里会把当前输入的 18 字节再拿出来处理。

可以看到它构造了一把 16 字节 AES key：

```latex
12 34 12 34 12 34 12 34 12 34 12 34 41 45 53 21
```

也就是：

```latex
12341234123412341234123441455321
```

随后用 AES-128-ECB 对输入做加密，并和下面这 32 字节密文比较：

```latex
f2 7b 7e 75 b4 5c 08 fa 19 3c 8a 4a 04 f8 1f 67
1b 05 9c e7 27 40 78 6d 28 f6 a8 b8 06 c6 c5 51
```

这里 32 字节对应的是两组 AES block，因此直接用同一把 key 做 ECB 解密即可。

## 还原真实 flag
对上面的 AES 密文解密后，得到明文：

```latex
R3a1_w0rld_M47ters
```

长度正好也是 18 字节，因此真实 flag 就是：

```latex
xmctf{R3a1_w0rld_M47ters}
```

## 为什么这才是真 flag
这题名叫 `Illusion`，出题点就在这里：

+ `main` 里那层 RC4 会把人引到一个看似合理、实际上错误的假 flag
+ 真正的 flag 被藏在入口处对 `MessageBoxA` 的 hook 里
+ hook 里甚至还出现了 `real world` 这样的字符串，明显在暗示“真实世界”的答案不在表面逻辑中

所以这题的核心不是停在 `main`，而是要继续把启动阶段的自修改 / hook 逻辑也翻完。

## 复现脚本
我把复现脚本放在同目录下的 `solve.py`，它会同时输出：

+ 第一层 RC4 解出来的假 flag
+ 第二层 AES 解出来的真 flag

运行：

```powershell
python .\solve.py
```

输出中第二层结果就是最终答案。

## 最终答案
```latex
xmctf{R3a1_w0rld_M47ters}
```

# 11.MixTielele
## 题目信息
+ 题目目录：`mixtielele`
+ 题目文件：`MixTielele.apk`
+ 题面提示：`please login as admin`

最终 flag：

```plain
xmctf{adde035c89b5fb477e43b1ef78c8d890}
```

## 一、先看 APK 结构
目录里只有一个 APK：

```powershell
Get-ChildItem .
```

直接用 `apktool` 和 `jadx` 反编译：

```powershell
apktool d -f MixTielele.apk -o apktool_out
jadx -d jadx_out MixTielele.apk
```

`AndroidManifest.xml` 里能看到：

+ 包名：`com.example.titlele`
+ 入口 Activity：`com.example.titlele.OO00OO0OOOO000O000`
+ `android:debuggable="true"`

这说明题目本身没有刻意关闭调试，而且主逻辑大概率就在这个 Activity 里。

## 二、入口 Activity 分析
入口类 `OO00OO0OOOO000O000` 的核心逻辑如下：

```java
private void login() {
    OO00OO0OO0000OOOOO.load(this);
    OO00OO0OOOOO0O00OO impl = OO00OO0OO00OOOOOO0.get();
    String loginInfo = impl.Login("user");
    String json = EncTitlele(loginInfo);
    POST http://120.48.104.4:2788/24ab99d75d3327cf3c46/login
}
```

也就是说按钮点击后会做三件事：

1. 先调用 `OO00OO0OO0000OOOOO.load(this)` 加载额外 payload。
2. 再取出一个接口实现，执行 `Login("user")`。
3. 把结果交给 native 方法 `EncTitlele(...)` 做二次处理，然后发给远端。

### 2.1 为什么这里有坑
表面上看，`OO00OO0OO00OOOOOO0` 这个类里也有一个 `Login(String)`：

```java
public static String Login(String UserName) throws Exception {
    Cipher cipher = Cipher.getInstance("ARC4");
    SecretKeySpec keySpec = new SecretKeySpec(
        OO00OO0OO00O0OO0OO.OO00OOOOOO000O0O0OO0().getBytes(StandardCharsets.UTF_8),
        "ARC4"
    );
    cipher.init(1, keySpec);
    byte[] encryptedBytes = cipher.doFinal(UserName.getBytes(StandardCharsets.UTF_8));
    return Base64.encodeToString(encryptedBytes, 2);
}
```

但这个方法根本没有被调用。

真正执行的是：

```java
OO00OO0OOOOO0O00OO impl = OO00OO0OO00OOOOOO0.get();
String loginInfo = impl.Login("user");
```

`get()` 返回的是一个运行时注册进去的接口实现，不是当前 dex 里那段静态方法。也就是说，真正的逻辑被藏起来了。

## 三、隐藏 payload 在哪里
`OO00OO0OO0000OOOOO.load(this)` 很关键：

```java
File so = new File(ctx.getApplicationInfo().nativeLibraryDir, "libflutter.so");
PathClassLoader pcl = new PathClassLoader(so.getAbsolutePath(), ctx.getClassLoader());
Class.forName("com.example.titlele.OO00OO0OO00O0OO000", true, pcl);
```

这里非常反常：

+ 它没有加载普通 dex/jar
+ 而是直接把 `libflutter.so` 当作 `PathClassLoader` 的输入

这通常意味着：`**libflutter.so**`** 里藏了 dex**。

### 3.1 扫描 `libflutter.so` 中的 dex 头
可以直接扫描 `dex\n`：

```python
from pathlib import Path
import struct

p = Path("apktool_out/lib/arm64-v8a/libflutter.so")
data = p.read_bytes()

offsets = []
start = 0
while True:
    idx = data.find(b"dex\n", start)
    if idx == -1:
        break
    offsets.append(idx)
    start = idx + 1

print([hex(x) for x in offsets])
for off in offsets:
    file_size = struct.unpack_from("<I", data, off + 0x20)[0]
    print(hex(off), hex(file_size))
```

实际能扫到 6 个 dex：

```plain
0x2c
0xd88
0x7db8c
0x81e18
0x2f3d58
0xb18cd4
```

### 3.2 把隐藏 dex 切出来
按 dex header 里的 `file_size` 直接切：

```python
from pathlib import Path
import struct

src = Path("apktool_out/lib/arm64-v8a/libflutter.so")
outdir = Path("flutter_embedded_dex")
outdir.mkdir(exist_ok=True)
data = src.read_bytes()

offsets = [0x2c, 0xd88, 0x7db8c, 0x81e18, 0x2f3d58, 0xb18cd4]

for i, off in enumerate(offsets, 1):
    size = struct.unpack_from("<I", data, off + 0x20)[0]
    chunk = data[off:off + size]
    (outdir / f"carved_{i}_{off:08x}.dex").write_bytes(chunk)
```

然后分别用 `jadx` 看：

```powershell
jadx -d carved1_jadx .\flutter_embedded_dex\carved_1_0000002c.dex
jadx -d carved3_jadx .\flutter_embedded_dex\carved_3_0007db8c.dex
jadx -d carved5_jadx .\flutter_embedded_dex\carved_5_002f3d58.dex
```

## 四、隐藏 dex 里的真实登录逻辑
### 4.1 运行时注册代理类
在 `carved_1` 里能看到 `OO00OO0OO00O0OO000`：

```java
public final class OO00OO0OO00O0OO000 {
    static {
        register();
    }

    private static void register() {
        ClassLoader cl = OO00OO0OO00O0OO000.class.getClassLoader();
        Class<?> signInterface = cl.loadClass("com.example.titlele.OO00OO0OOOOO0O00OO");
        Object proxy = Proxy.newProxyInstance(
            signInterface.getClassLoader(),
            new Class[]{signInterface},
            new OO00OO0OOO00O00O00()
        );
        Class<?> center = cl.loadClass("com.example.titlele.OO00OO0OO00OOOOOO0");
        Method register = center.getMethod("register", signInterface);
        register.invoke(null, proxy);
    }
}
```

这就解释了前面的 `OO00OO0OO00OOOOOO0.get()`：

+ 它拿到的是运行时用 `Proxy` 注册进去的实现
+ 真正的 `Login` 逻辑在 `OO00OO0OOO00O00O00`

### 4.2 真正的 `Login` 在做什么
`OO00OO0OOO00O00O00` 代码如下：

```java
public final class OO00OO0OOO00O00O00 implements InvocationHandler {
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if ("Login".equals(method.getName())) {
            return LogInfo((String) args[0]);
        }
        return null;
    }

    private String LogInfo(String s) {
        UserProto.LoginInfo info = UserProto.LoginInfo.newBuilder()
            .setUser(s)
            .setIsHacker(true)
            .build();
        byte[] serialized = info.toByteArray();
        byte[] data = Encrypt.enc(serialized);
        String base64 = Base64.encodeToString(data, 2);
        return base64;
    }
}
```

重点有两个：

1. 它构造的是一个 protobuf：`LoginInfo`
2. 它把 `isHacker` 强行设成了 `true`

### 4.3 `LoginInfo` 的 protobuf 结构
在 `carved_3` 里能看到 protobuf 描述：

```plain
message LoginInfo {
    string user = 1;
    bool isHacker = 2;
}
```

也就是说，客户端真正传给服务端的数据本质上是：

```plain
user = "user"
isHacker = true
```

### 4.4 `Encrypt.enc()` 的实现
在 `carved_5` 里能看到：

```java
public class Encrypt {
    private static final int INCREMENT = 1013904223;
    private static final int INITIAL_SEED = 622918;
    private static final int MULTIPLIER = 1664525;

    public static byte[] enc(byte[] data) {
        byte[] result = new byte[data.length];
        int currentKey = INITIAL_SEED;
        for (int i = 0; i < data.length; i++) {
            byte xorMask = (byte) currentKey;
            result[i] = (byte) (data[i] ^ xorMask);
            currentKey = (MULTIPLIER * currentKey) + INCREMENT;
        }
        return result;
    }
}
```

这层根本不是复杂加密，只是一个固定种子的 LCG 逐字节异或。

到这里，Java 层的数据流程已经清楚了：

```plain
LoginInfo protobuf
-> LCG XOR
-> Base64
```

## 五、native `EncTitlele` 分析
Java 里还有最后一层：

```java
String json = EncTitlele(loginInfo);
```

这个方法在 `libmixtitlele.so` 里。

### 5.1 `JNI_OnLoad` 动态注册 native 方法
`libmixtitlele.so` 里没有直接导出的 `Java_xxx_EncTitlele`，说明它是动态注册的。看 `JNI_OnLoad`：

+ `FindClass("com/example/titlele/OO00OO0OOOO000O000")`
+ `RegisterNatives(...)`

`JNINativeMethod` 表里能直接找到这三个元素：

+ 方法名：`EncTitlele`
+ 签名：`(Ljava/lang/String;)Ljava/lang/String;`
+ 函数地址：`0xd6df8`

### 5.2 还原 `EncTitlele` 的逻辑
从 `0xd6df8` 的函数反汇编可以还原出：

1. 取 Java 传入的字符串
2. 生成 16 字节随机 AES key
3. 用内置 RSA 公钥把 AES key 加密并 Base64，得到 `a1`
4. 用 `AES-128-CBC` 加密登录字符串，IV 是 16 字节全 0，结果 Base64，得到 `b2`
5. 拼成 JSON：

```json
{"a1":"...","b2":"..."}
```

### 5.3 提取内置 RSA 公钥
公钥直接在 `.rodata` 里，偏移附近能读到完整 PEM：

```plain
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAovOZy74DuQ55Nr/mOKROqHjcjVF8V2OrRPEAXz6x61z+jgUBZ6aIFLh3S0/6YSO9/OlWIsrkaJlISCPdrLOjnvSwt6IOiWKVbzcxqyblR8MHbM74Lp7l9T8M9rKqQmjiCFPcbcpyAsABg5CwgthfBo26BIusvptmb+rHXO5kylRHTMbXrBfC5Yagp25M7bCbpg7JqtR4uaaKg9c849+BrvYq5PHtfDMAbUVSCbXG17/lR/1WENQSbPTAgdtmkUvdcwV14iHYIhuspiXnIa/Z5Ze/xekUvwYVk09/pU7T0zSVxR+gRUhNPtKZYiZ/w7alSAVjvGooOSc+ps+7KVCkyQIDAQAB
-----END PUBLIC KEY-----
```

因此 native 层整体就是：

```plain
loginString
-> AES-128-CBC(key=random16, iv=0x00*16)
-> b2 = Base64(ciphertext)

random16
-> RSA public encrypt
-> a1 = Base64(ciphertext)

final json = {"a1":"...","b2":"..."}
```

## 六、和服务端交互验证
根据上面的分析，我们可以自己重放请求。

### 6.1 先按原始逻辑发请求
原始 APK 的逻辑等价于：

```plain
user = "user"
isHacker = true
```

发送后，服务端返回：

```plain
login as admin
```

这和题面完全吻合。

### 6.2 只改成 `admin` 还不够
如果只把用户名改成 `admin`，但仍然保留：

```plain
isHacker = true
```

服务端返回：

```plain
hacker!!!
```

也就是说，服务端除了检查是不是 `admin`，还会检查你是不是“黑客模式”。

### 6.3 真正的解法
把请求改成：

```plain
user = "admin"
isHacker = false
```

或者直接省略 `isHacker` 字段（proto3 里默认就是 `false`），都可以拿到 flag。

服务端返回：

```plain
xmctf{adde035c89b5fb477e43b1ef78c8d890}
```

## 七、可复现脚本
我把复现脚本保存成了同目录下的 `solve.py`。

默认参数就是正确解：

```powershell
python .\solve.py
```

预期输出：

```plain
status: 200
xmctf{adde035c89b5fb477e43b1ef78c8d890}
```

### 7.1 验证不同分支
原始 APK 行为：

```powershell
python .\solve.py --user user --hacker true
```

返回：

```plain
login as admin
```

只改用户名但保留黑客标记：

```powershell
python .\solve.py --user admin --hacker true
```

返回：

```plain
hacker!!!
```

正确解：

```powershell
python .\solve.py --user admin --hacker false
```

或：

```powershell
python .\solve.py --user admin --hacker omit
```

都能拿到 flag。

## 八、这题的考点总结
这题其实是一个“混合藏逻辑”的 APK：

1. Java 入口层只给你表面逻辑。
2. 真正的接口实现藏在 `libflutter.so` 里的隐藏 dex。
3. 最终网络请求又包了一层 native 加密。

核心坑点有三个：

1. `OO00OO0OO00OOOOOO0.Login(...)` 是假线索，真正逻辑来自运行时 `Proxy`。
2. `libflutter.so` 不是单纯的 so，而是 dex 容器。
3. 真正阻止你拿 flag 的不是用户名，而是 `isHacker=true` 这个隐藏字段。

## 九、一句话结论
题面说 `please login as admin`，真正的含义其实是：

```plain
不仅要把 user 改成 admin，还要把 isHacker 改成 false
```

最终 flag：

```plain
xmctf{adde035c89b5fb477e43b1ef78c8d890}
```

# 12.Oracle_Eye WP
## 题目信息
+ 题目名称：`Oracle_Eye`
+ 题目类型：逆向 / 模型逆向 / 频域后门

最终 flag：

```plain
xmctf{Y0u_H4v3_Tru1y_S33n_Th3_0r4c13_1n_Th3_N0is3}
```

---

## 一、附件分析
拿到附件后先看目录结构，可以发现核心文件如下：

+ `oracle_eye`：Linux ELF 主程序
+ `oracle_eye.onnx`
+ `oracle_eye.onnx.data`
+ `run.sh`
+ `lib/libonnxruntime.so.1.19.2`

其中 `run.sh` 内容很简单，本质上就是设置 `LD_LIBRARY_PATH` 后运行 `./oracle_eye`，说明主逻辑都在 ELF 和 ONNX 模型里。

---

## 二、先排除诱饵
对 ELF 做字符串搜索时，很容易发现两个看起来像 flag 的字符串：

```plain
xmctf{old_interfface_deprecated}
xmctf{dimension_xmctf{this_is_not_the_real_flag}
```

第二个字符串已经明确写了 `this_is_not_the_real_flag`，基本可以判断这些都是诱饵，不能直接交。

同时还能看到一些关键字符串：

+ `class_id`
+ `fingerprint`
+ `trigger_score`
+ `image`
+ `64x64 PGM (P5)`

说明程序会读取图像，送入 ONNX 模型推理，然后根据输出结果进一步判定。

---

## 三、输入格式分析
通过逆向程序读入逻辑，可以看出它支持以下输入方式：

1. 从文件读取 `64x64` 的 `PGM(P5)` 灰度图
2. 从标准输入直接读取 `4096` 字节灰度数据

程序里还保留了一个类似开发接口的提示，大意是也能输入 `4096` 个 float，但更像调试接口，不是正常赛题入口。

因此，正常使用时可以认为输入就是 `64x64` 单通道灰度图。

---

## 四、ONNX 模型分析
用 `onnxruntime` 查看模型的输入输出：

+ 输入：`image`
+ 输出： 
    - `class_id`
    - `fingerprint`
    - `trigger_score`

继续查看模型图，会发现一个非常关键的点：

`trigger_score` 不是神经网络学习出来的分类结果，而是作者手工写在模型里的频域检测逻辑。

模型对输入做二维 DCT 后，只抽取以下四个频点：

+ `(5, 5)`
+ `(10, 10)`
+ `(15, 15)`
+ `(20, 20)`

并分别与四个固定值比较：

+ `0.3142`
+ `0.2718`
+ `0.2828`
+ `0.3466`

比较形式可以概括为：

```plain
exp(-3 * abs(x - target) / 0.02)
```

四项相乘后得到 `trigger_score`。

这也正好对应题目的 Hint：

```plain
神谕隐藏在频率之中
```

所以这题的核心不是普通图像识别，而是一个藏在频域中的后门触发器。

---

## 五、分类结果不是终点
模型一共有 5 个分类，对应程序中的字符串大致为：

+ 凡人
+ 智者
+ 勇者
+ 先知
+ 神谕

其中 `class_id == 4` 对应“神谕”。

但是这题还有第二层校验。  
即使模型输出了“神谕”，程序也不会立刻给最终结果，而是会进入一段“深层验证”逻辑。

这段逻辑会：

1. 再次根据那 4 个目标 DCT 频点重建一份内部特征
2. 将这份特征和模型输出的 `fingerprint` 做逐项比较
3. 只有全部匹配，才算真正通过

也就是说，真正的解题条件不是“分类成神谕”这么简单，而是必须让这四个频点落到正确位置上，从而同时满足：

+ `trigger_score` 足够高
+ `class_id == 4`
+ `fingerprint` 通过内部二次校验

---

## 六、深层验证与真实 flag
继续逆向“深层验证”后面的字符串生成函数，可以发现它取的正是四个目标频点对应的固定值，并先乘以 `10000`：

+ `0.3142 -> 3142`
+ `0.2718 -> 2718`
+ `0.2828 -> 2828`
+ `0.3466 -> 3466`

然后将这四个整数按位打包成一个 64 位种子，再加上一个固定常量：

```plain
0xCDAB8C75B9187834
```

之后程序会：

1. 用一个 `splitmix64` 风格的伪随机过程生成字节流
2. 与 `.rodata` 中的一段固定 50 字节数据异或
3. 再对每个字节做循环右移 3 位

最终解码出真实 flag：

```plain
xmctf{Y0u_H4v3_Tru1y_S33n_Th3_0r4c13_1n_Th3_N0is3}
```

---

## 七、关键结论
这题真正的难点不在神经网络本身，而在于识别出：

1. ELF 里存在假 flag 诱饵
2. ONNX 模型内嵌了手工构造的 DCT 频域触发器
3. 四个关键频点分别是： 
    - `(5,5)=0.3142`
    - `(10,10)=0.2718`
    - `(15,15)=0.2828`
    - `(20,20)=0.3466`
4. 程序会根据这四个值进一步生成真实 flag

所以最终并不是靠字符串直接拿 flag，而是靠还原频域后门和后续解码逻辑。

---

## 八、解题脚本
本地解题脚本如下：

+ `solve_oracle_eye.py`

直接运行：

```powershell
python .\solve_oracle_eye.py
```

输出：

```plain
xmctf{Y0u_H4v3_Tru1y_S33n_Th3_0r4c13_1n_Th3_N0is3}
```

---

## 九、简要总结
这题是一个比较典型的“模型 + 本地校验”混合题。题面说“神谕隐藏在频率之中”，实际上就是提示输入图像需要在 DCT 频域里满足特定条件。模型并不是真的识别“天选之人”，而是在检测四个指定频点是否精确命中。命中后模型会输出神谕分类，同时程序内部再做一层 fingerprint 校验，最后用这四个频点对应的数值解码出真实 flag。

最终 flag：

```plain
xmctf{Y0u_H4v3_Tru1y_S33n_Th3_0r4c13_1n_Th3_N0is3}
```

# 13.ocean
## 题目结论
这题的目标不是直接恢复远端 `FLAG`，而是先恢复本轮实例里的：

```python
secret = f"fakeflag{{{os.urandom(16).hex()}}}"
```

只要把这个 `secret` 原样发回去，服务端就会返回当前容器对应的真实 flag。  
注意这里的远端容器会轮换，所以：

+ `flag` 不是固定值
+ `host/port` 也可能变化
+ 正确的复现方式应该是“给定最新地址，脚本自动解出当前实例”

## 题目逻辑
源码见 `chal.py`。

核心流程如下：

1. 生成 64 位随机 `seed`
2. 用同一个 `seed` 初始化两个寄存器
3. 输出 `mask1`、`mask2`、`output`、`enc`
4. 如果用户输入等于本轮生成的 `secret`，就返回真实 flag

关键代码抽象后是：

```python
lfsr1 = LFSR(64, seed, mask1)
lfsr2 = MLFSR(64, seed, mask2, lfsr1)
output = ...
enc = AES.new(md5(str(seed).encode()).digest(), AES.MODE_ECB).encrypt(pad(secret.encode(), 16))
```

其中：

+ `lfsr1` 每次调用都会更新
+ `lfsr2` 只有在 `lfsr1()` 输出为 `1` 时才更新
+ `output` 是 64 次过程中 `lfsr2` 末位拼出来的结果
+ `enc` 用 `md5(str(seed))` 作为 AES-ECB 的密钥

所以解题路径很自然：

1. 先从 `mask1`、`mask2`、`output` 恢复候选 `seed`
2. 再用 `enc` 把真正的 `seed` 筛出来
3. 解出 `secret`
4. 回传 `secret` 拿 flag

## 建模思路
把 64 位 `seed` 看成 GF(2) 上的 64 维向量。

对于固定的 `mask1`、`mask2`，可以预处理出两类线性形式：

1. `A_t(seed)`：第 `t` 次调用 `lfsr1()` 的输出位
2. `B_q(seed)`：`lfsr2` 一共更新了 `q` 次之后的末位

那么第 `t` 步打印出来的 `output` 位可以表示为：

```latex
z_t = B_{q_t}(seed)
q_t = sum_{i=1..t} A_i(seed)
```

难点在于 `q_t` 本身依赖前面的输出，所以整体不是一个单纯的线性方程组，而是“带分支的线性约束搜索”。

## 求解方法
最终实现采用的是：

```latex
DFS + GF(2) 高斯消元 + 剪枝
```

搜索到第 `t` 步时，枚举这一位 `lfsr1` 输出 `c`：

+ 如果 `output[t] != output[t-1]`，说明这一步一定发生了更新，所以 `c = 1`
+ 否则 `c` 可以是 `0` 或 `1`

一旦选定 `c`，就能加入两条线性约束：

1. `A_t(seed) = c`
2. `B_q(seed) = output[t]`

其中 `q` 是当前累计更新次数。

实现层面用 64 位整数直接表示 GF(2) 线性形式，并在 DFS 过程中动态维护消元基。

为了继续提速，又做了一个秩上界剪枝。预处理：

```latex
rem[t][q] = rank(span(A_t..A_63, B_q..B_64))
```

如果当前已经收集到的线性系统秩为 `rank_now`，满足：

```latex
rank_now + rem[t][q] < 64
```

那说明这个分支后续无论怎么走，都不可能把 `seed` 确定到足够可验证的程度，可以直接剪掉。

## 为什么还要用 `enc` 二次过滤
仅靠题目给出的 64 位 `output`，实际可能对应多个 `seed`。  
也就是说，`mask1 + mask2 + output` 并不总能唯一确定 `seed`。

因此 helper 枚举出来的是一批候选值，而不是唯一解。

这时再用 `enc` 做最后筛选：

1. 对每个候选 `seed` 计算 `md5(str(seed))`
2. 用它解密 `enc`
3. 如果明文匹配：

```latex
fakeflag{[0-9a-f]{32}}
```

那这个 `seed` 就是真的，进而得到本轮 `secret`

## 实战策略
在远端 60 秒限制下，没有必要在单个实例上死磕特别大的搜索空间。  
更稳的办法是：

1. 先枚举前 `8` 个候选
2. 用 `enc` 检查是否命中
3. 没命中就扩大到 `32`
4. 还没命中再扩大到 `1024`
5. 如果这一轮还没有，就直接重连拿新实例

因为有些实例非常容易，前几个候选里就能直接命中真解；  
脚本自动重试通常比在单个实例上硬算到底更稳。

## 文件说明
本目录最终保留了这几份可复现文件：

+ `solve_ocean.py`
+ `ocean_oneshot.py`
+ `seed_helper.c`

它们的分工是：

+ `seed_helper.c`：高性能枚举候选 `seed`
+ `solve_ocean.py`：带详细日志的主解题脚本
+ `ocean_oneshot.py`：更适合直接发给队友的一把梭版本

## 复现方式
### 详细版
在 `ocean` 目录执行：

```bash
python solve_ocean.py nc1.ctfplus.cn 47490
```

如果容器地址更新，直接替换成新的 `host port` 即可。

### 一把梭版
`ocean_oneshot.py` 支持以下几种用法：

```bash
python ocean_oneshot.py
python ocean_oneshot.py nc1.ctfplus.cn 47490
python ocean_oneshot.py nc1.ctfplus.cn:47490
```

也支持环境变量：

```bash
set OCEAN_HOST=nc1.ctfplus.cn
set OCEAN_PORT=47490
python ocean_oneshot.py
```

Windows 下还可以直接双击：

```plain
run_ocean.bat
```

脚本会自动：

1. 查找或编译 `seed_helper`
2. 连接远端
3. 恢复本轮 `secret`
4. 回传并输出当前容器的真实 flag

## 一次成功样例
下面是之前某一轮容器上的真实运行结果，仅作为样例：

```latex
[attempt 1] helper returned 8 candidate(s) at limit=8 in 2.21s
[attempt 1] secret=fakeflag{3e9334f09cff2e686702a5c19e7dc869}
🤭: xmctf{f4c5a559-6e63-4a65-b739-14c85817b94d}
```

这里的 `xmctf{...}` 只代表当时那一轮容器的结果，不代表未来固定不变。

# 14.RSA or LCG ?
## 题目信息
+ 附件: `task.py`
+ 远程: `nc1.ctfplus.cn 48176`
+ 实际拿到的 flag:

```plain
XMCTF{e08e5dea-2f66-4ae8-ac67-1954cdf7a8c4}
```

---

## 1. 代码审计
题目核心代码如下:

```python
seed = bytes_to_long(secret)
a = random.getrandbits(1024)
b = random.getrandbits(1024)

out1 = (a * seed + b)^e mod N
out2 = (a * out1_plain + b)^e mod N
leak = (b - a)^e mod N
```

更准确地记号化:

+ 设 `x = seed = bytes_to_long(secret)`
+ 设 `y = a*x + b`
+ 设 `d = (b-a) mod N`
+ 则

```plain
c1 = y^e mod N
c2 = (a*y + b)^e mod N = (a*(y+1) + d)^e mod N
leak = d^e mod N
```

其中 `e = 263`，`N = p*q` 为 2048-bit。

### 关键观察
`secret` 只有 64 字节，即 512 bit，而 `a,b` 只有 1024 bit，所以:

```plain
y = a*x + b < 2^1024 * 2^512 + 2^1024 < 2^1537
```

而 `N` 是两个 1024-bit 素数乘积，约 2048 bit，因此:

```plain
y < N
```

所以第一轮实际上没有发生模约减:

```plain
y = a*x + b
```

这一步非常重要，因为最后我们可以直接从 `y` 反推 `secret`。

---

## 2. 先解出 `q = (y+1)^e`
已知:

```plain
c2 = (a*(y+1) + d)^e mod N
leak = d^e mod N
```

令:

```plain
u = a*(y+1)
q = (y+1)^e
```

则 `u^e = a^e * q`。

### 2.1 构造只含 `u^e` 的多项式
考虑多项式:

```plain
P(Z) = Z^e - c2
Q(Z) = (Z-u)^e - leak
```

它们有公共根，因为真实的 `Z = a*(y+1)+d` 同时满足两式。

消去 `Z` 后得到:

```plain
F(U) = Res_Z(Z^e-c2, (Z-u)^e-leak), 其中 U = u^e
```

于是:

```plain
F(a^e q) = 0 mod N
```

### 2.2 `F` 的根和 power sums
设 `alpha^e = c2`，`beta^e = leak`，`omega` 为 `e` 次单位根，则 `F(U)` 的根为:

```plain
Ui = (alpha - beta * omega^i)^e
```

所以它们的幂和为:

```plain
S_m = sum(Ui^m)
    = e * sum_{j=0..m} (-1)^j * C(em, ej) * c2^(m-j) * leak^j
```

有了 `S_1 ... S_e`，就可以用 Newton identities 恢复出 `F(U)` 的全部系数。

---

## 3. 由 `c1 = y^e` 构造 `q` 的另一个方程
因为:

```plain
q = (y+1)^e
```

而又已知:

```plain
y^e = c1
```

所以同样可以消元构造:

```plain
G(Q) = Res_X(X^e-c1, (X+1)^e-Q)
```

真实的 `q` 必然满足:

```plain
G(q) = 0 mod N
```

`G` 的根为:

```plain
Qi = (gamma * omega^i + 1)^e, 其中 gamma^e = c1
```

因此幂和:

```plain
T_m = e * sum_{j=0..m} C(em, ej) * c1^j
```

再用 Newton identities 得到 `G(Q)`。

---

## 4. 用 gcd 求出 `q` 与 `y`
因为真实 `q` 同时满足:

```plain
F(a^e q) = 0
G(q) = 0
```

所以:

```plain
gcd(F(a^e Q), G(Q)) = Q - q
```

进而得到 `q`。

随后解:

```plain
gcd(X^e-c1, (X+1)^e-q) = X - y
```

从而恢复出第一轮 LCG 明文 `y`。

---

## 5. 从 `y` 还原 `secret`
前面已经知道:

```plain
y = a*x + b
```

其中 `x = seed`，`b` 仍未知。

再看:

```plain
leak = (b-a)^e mod N
```

由于 `y = a*x + b` 是整数关系，所以:

```plain
b = y mod a + k*a
```

其中 `k = floor(b/a)`。

因为 `a,b` 都是同规模 1024 bit 随机数，`k` 在实际中通常非常小。于是可以直接枚举 `k`:

```plain
候选 b = y mod a + k*a
检查 pow((b-a) mod N, e, N) == leak
```

一旦命中:

```plain
x = (y-b) // a
secret = long_to_bytes(x, 64)
```

为了稳妥，脚本还保留了一个兜底:

```plain
gcd(D^e-leak, (D+a*(y+1))^e-c2) = D-d
```

从 `d = (b-a) mod N` 也能恢复 `b`。

---

## 6. 为什么脚本能跑得够快
在线阶段必须尽量压缩到 4 秒内。脚本里做了两点优化:

### 6.1 用 block recurrence 代替直接算大组合数
直接计算 `C(em, ej)` 很慢。注意到:

```plain
C(em, e(j+1)) / C(em, ej)
= prod_{t=1..e} (e(m-j-1)+t) / (ej+t)
```

令:

```plain
B_r = prod_{t=1..e} (er+t)
```

则上式可写成:

```plain
C(em, e(j+1)) / C(em, ej) = B_{m-j-1} / B_j
```

所以我们只需预处理 `B_r`，在线时模 `N` 求逆即可快速递推所有项。

### 6.2 `b` 用小范围枚举，不必再做一次完整 gcd
恢复 `y` 后，最后一步优先枚举 `k = b//a`，通常几乎瞬间命中，只有极少数情况下才回退到第三次 gcd。

---

## 7. 复现步骤
### 本地依赖
```bash
pip install pycryptodome gmpy2
```

### 运行
```bash
python solve.py nc1.ctfplus.cn:48176
```

如果网络抖动导致某一轮 4 秒超时，脚本会自动重连继续尝试。默认最多尝试 10 次。

也可以直接替换成新容器地址:

```bash
python solve.py 1.2.3.4:12345
```

---

## 8. 解题脚本说明
`solve.py` 做的事情如下:

1. 连接远程并读取 `N / a / leak / c1 / c2`
2. 构造 `F(a^e Q)` 与 `G(Q)`，gcd 得到 `q = (y+1)^e`
3. gcd 求出 `y`
4. 通过 `b = y mod a + k*a` 枚举得到 `b`
5. 计算 `seed = (y-b)//a`
6. 发送 `secret.hex()`，拿到 flag

---

## 9. 实战结果
我本地连远程拿到的结果是:

```plain
secret (hex): Good! Here is your flag: XMCTF{e08e5dea-2f66-4ae8-ac67-1954cdf7a8c4}
```

# 15.ez_random
题目目录：`ez_random`

远端：`nc1.ctfplus.cn 21725`

最终 flag：

```plain
XMCTF{9b7152a8-aba3-458a-9677-faeaeb94615b}
```

## 1. 题目逻辑
核心代码在 `task.py`：

```python
if t == '1':
    set_random_seed(int.from_bytes(SEED, 'big'))
    pairs = [(getrandbits(988), random_prime(get_limit(_))) for _ in range(1, 37)]
    ...
    shuffle(key0)
    print(f"Key Part A: {key0}")
    print(f"Key Part B0: {key1_list0}")
    print(f"Key Part B1: {key1_list1}")

elif t == '2':
    set_random_seed(int.from_bytes(SEED, 'big'))
    for k in range(1, 37):
        random_prime(int(input()) ^ (getrandbits(988) ^ get_limit(k)))
    SHA.update(str(getrandbits(256)).encode())
    KEY = SHA.digest()
    print("Flag:", AES.new(KEY, AES.MODE_ECB).encrypt(pad(flag)))
```

`patcher.py` 把 `sage.arith.misc.random_prime` 换成了本地的 `local_misc.py` 版本。这个版本唯一关键改动是：

```python
if prime_test(p.lift()):
    return p, count
```

也就是说，`option 1` 不光泄露了找到的素数，还把“试了多少次才找到素数”的 `count` 也一起泄露了。

## 2. 真正的坑点
一开始很容易误以为：

1. `getrandbits(988)` 用的是 Python `random.Random`
2. `random_prime()` 用的是另一个 Sage/GMP 随机源

但这题真正的坑在 `random_prime()` 里面的：

```python
randint = Zmod(n).random_element
```

而 `Zmod(n).random_element()` 继续调用的是 `sage.misc.prandom.randint`，也就是**同一个 Python PRNG**。

所以 `option 1` 里的随机流其实是：

```plain
getrandbits(988) -> random_prime 消耗若干次 randint -> getrandbits(988) -> ...
```

也因此：

1. `Key Part A` 里的 36 个 988-bit 数并不是连续输出
2. 它们之间夹着 `random_prime()` 的随机消耗
3. `shuffle(key0)` 只是把这 36 个块打乱了顺序

## 3. 时序恢复前 4 个 key0 的真实顺序
`option 2` 重新从同一个种子开始。设当前第 `k` 轮真正的 988-bit 输出是 `g_k`，我们发：

```plain
x = g_k ^ get_limit(k) ^ 2
```

那么服务端算出来的参数就是：

```plain
x ^ (g_k ^ get_limit(k)) = 2
```

此时 `random_prime(2)` 直接返回，响应非常快（实测约 0.3s）。

但这里有个关键细节：

前面的轮次不能全都强行设成 `2`，因为这样会让 PRNG 状态和 `option 1` 偏离。

正确做法是：

1. 想试探第 1 个 `key0`，直接枚举 `Key Part A` 中的 36 个候选，看哪个能让第 2 个提示瞬间出来
2. 想试探第 2 个 `key0`，先把第 1 轮**按 **`**option 1**`** 原样重放**  
做法是直接发送第 1 个真实 `key0`  
因为此时服务端会计算出 `n = get_limit(1)`，随后 `random_prime()` 的行为就和 `option 1` 完全一致
3. 再在第 2 轮把候选值异或成 `2` 来测时序
4. 第 3、4 个同理，前缀都按 `option 1` 原样重放

我本地测出来的前 4 个真实顺序（相对于泄露出的 `Key Part A` 下标）是：

```plain
[18, 27, 31, 21]
```

## 4. 为什么只要前 4 个就够了
`Key Part B1` 泄露的前 3 个 count 是：

```plain
[62, 46, 11, ...]
```

因此前 4 个 `key0` 在底层 32-bit MT 输出流中的起点分别是：

```plain
block1: 0
block2: 31 + 62 = 93
block3: 93 + 31 + 46 = 170
block4: 170 + 31 + 11 = 212
```

而 Python MT 的少输出种子恢复里，恢复 128-bit seed 只需要：

```plain
输出 0..5 和 输出 227..232
```

这里：

1. 输出 `0..5` 就在第 1 个 `key0` 里
2. 输出 `227..232` 落在第 4 个 `key0` 里
3. 因为第 4 个块起点是 `212`，所以它们正好是第 4 块的偏移 `15..20`

## 5. 用 BitsDeep 的 MT 逆算法恢复 Python seed
我用了经典的 MT 逆向公式：

1. 先对输出做 `untemper`
2. 用 `S_i` 和 `S_{i+227}` 逆出初始状态里的若干 `I_i`
3. 再从 `I_228..I_233` 逆回 `K[0..3]`

因为 `I_233` 的最高位不确定，所以会得到 2 个 seed 候选。

再把候选 seed 代回去完整模拟 `option 1`：

1. 生成 36 个 `getrandbits(988)`
2. 用 Python 自己的 `randrange(limit)` 模拟 `random_prime`
3. 用 32-bit 确定性 Miller-Rabin（bases = `2,7,61`）判断素数
4. 检查： 
    - `sorted(key0)` 是否和 `Key Part A` 一致
    - `prime list` 是否和 `Key Part B0` 一致
    - `count list` 是否和 `Key Part B1` 一致

唯一通过验证的 Python seed 是：

```plain
0xbc6922f0550d55ecdc63f40956b5f997
```

## 6. 最终利用
拿到这个 Python seed 后，就可以完全控制 `option 2`。

这次我们的目标不是复现 `option 1`，而是让 36 次 `random_prime()` 都变成：

```plain
random_prime(2)
```

这样中间就**不再额外消耗任何随机数**。

具体做法：

1. 用恢复出来的 seed 重新生成 36 个**连续的**`getrandbits(988)`，记为 `h_1..h_36`
2. 第 `k` 轮发送：

```plain
x_k = h_k ^ get_limit(k) ^ 2
```

1. 服务端每轮都变成 `random_prime(2)`，所以 36 轮后直接取下一次 `getrandbits(256)`
2. 本地也同步取出这 256 bit，得到：

```python
KEY = SHA256(str(next_256).encode()).digest()
```

1. 拿它去解密服务端回显的 ECB 密文即可

## 7. 复现脚本
脚本：`solve_ez_random.py`

默认就是**从远端全自动复现**：

```bash
python .\solve_ez_random.py
```

如果只想快速复现最后一步，也可以直接把我已经恢复出的 Python seed 传进去：

```bash
python .\solve_ez_random.py --seed 0xbc6922f0550d55ecdc63f40956b5f997
```

脚本会输出：

1. `option 1` 的泄露内容
2. 时序恢复得到的前 4 个 `key0` 顺序
3. 恢复出的 Python seed
4. 完整 `key0` 顺序
5. 预测到的最后 `getrandbits(256)`
6. 最终 flag

# 复现1.ShakeLife
## 前言
这题是我很喜欢的一道逆向题。

它最妙的地方在于：程序里确实摆着一条非常完整、非常像“最终校验”的明线，而且这条明线不是假的，真的能逆，真的能算出一个 43 字节输入；但如果你到此为止，就会得到一个“逻辑正确、提交错误”的答案。真正决定 `Correct!` 的流程，藏在程序退出阶段，而且是运行时动态改写之后才出现的。

这篇文章会按完整复现的顺序来写：

1. 先把明面上的 `main -> 0x41d9 -> memcmp` 讲清楚。
2. 再说明为什么这条路虽然能逆，但不是最终答案。
3. 然后定位真正的隐藏流程：运行时改写的 `.fini_array`。
4. 最后把隐藏目标逆回成真正的 flag。

最终 flag 是：

```latex
xmctf{The_0nly_cOns3ant_in_l1fe_isK_chAnge}
```

---

## 一、第一眼看上去，程序的校验逻辑非常清晰
先看 `main` 附近最显眼的一段：

```z80
2ae3: lea    rax,[rbp-0x2880]
2aea: mov    r9,rsi
2aed: mov    r8,rcx
2af0: mov    rcx,rdx
2af3: lea    rdx,[rip+0x99a6]        # c4a0
2afa: lea    rsi,[rip+0x989f]        # c3a0
2b01: mov    rdi,rax
2b04: call   41d9
...
2bff: lea    rsi,[rip+0x54da]        # 80e0
2c06: lea    rdi,[rip+0x9893]        # c4a0
2c0d: call   memcmp@plt
2c12: test   eax,eax
2c14: jne    2c29
2c16: lea    rsi,[rip+0x93eb]        # c008
2c1d: lea    rdi,[rip+0x941c]        # cout
```

直译一下就是：

+ 用户输入先进入 `c3a0`
+ `0x41d9` 把输入处理后写到 `c4a0`
+ `memcmp(c4a0, 0x80e0, 43)`
+ 相等则打印 `Correct!`

这条线非常完整，而且很像最后答案，所以第一反应通常就是：

1. 逆 `0x41d9`
2. 让 `c4a0` 等于 `0x80e0` 那 43 字节常量
3. 得到原始输入

这条路本身没有问题。它确实能逆出一个 preimage。

我后来把这条明线完整还原以后，得到的 43 字节输入是：

```latex
8134fd85df9ed6514b217351ad85d660546cb4fa2641257f9311f5a8033424da69fcbc35b7d86990a62549
```

把它代回去，的确满足：

```latex
forward(payload)[:43] == binary[0x80e0:0x80e0+43]
```

也就是说，这条 `memcmp` 路是“真能过”的。

但问题恰恰在这里：它只是**明线能过**，不是**整题真正能交**。

---

## 二、为什么这条明线答案不对
### 1. 先做一次运行时观察
光盯静态汇编还不够，我这里做了一件很直接的事：

+ hook `memcmp`
+ hook `__cxa_atexit`
+ 在 `memcmp(n == 43)` 时，把 `c4a0`、`c5a0`、`.init_array`、`.fini_array` 等关键位置一起打出来

最关键的一组运行时输出如下：

```latex
[memcmp43] base=0x60bd6a1f4000 chk=0x15
memcmp.s1=9020606c8944671d9fb362d9cce71d20b6a30af47de22e8cf56f3a9408a12e3aadf436b6ce52e0c61b6421
memcmp.s2=8da4efed737854927e5ff15ac2c310e6c27b3012d2a78cc0cccb04c2d766b6437f17b25b85400070899b8f
c4a0=9020606c8944671d9fb362d9cce71d20b6a30af47de22e8cf56f3a9408a12e3aadf436b6ce52e0c61b6421000000000000000000000000000000000000000000
c5a0=9020606c8944671d9fb362d9cce71d20b6a30af47de22e8cf56f3a9408a12e3aadf436b6ce52e0c69f145f8d24744671a26861b1bebdb04d1b64210000000000
blob73ce=a47c3b3f4990c8eba741f55da9312a1f802feffe80be3d7e2796a742ce7fd13e0ab21a7e54b70ae876fdb664cd9daf984b818858575459a41987fce9e9e9e9e9
hidden_expected=b1692e2a5c85ddfeb254e048bc243f0a953afaeb95ab286b3283b257db6ac42b1fa70f6b41a21ffd63e8a371d888ba8d5e949d4d42414cb10c92e9fcfcfcfcfc
[memcmp43] c5_vs_expected=-33
```

这里马上能看出两件事：

+ 明面的 `memcmp` 比较对象确实是 `c4a0`
+ 但程序内部还有一块 64 字节状态 `c5a0`

更重要的是：

```latex
c5a0 != hidden_expected
```

这说明 `memcmp` 之后还有别的校验。

### 2. 静态 `.fini_array` 没问题，但运行时 `.fini_array[0]` 被替换了
先看静态 ELF 里的 `.fini_array`：

```bash
readelf -W -x .fini_array ./ShakeLife
```

输出：

```latex
Hex dump of section '.fini_array':
  0x0000bc78 00250000 00000000 60250000 00000000 .%......`%......
```

也就是静态状态下：

+ `.fini_array[0] = 0x2500`
+ `.fini_array[1] = 0x2560`

但运行时我打出来的是：

```latex
fini_array=45b31f6abd60000060651f6abd600000
```

如果基址是 `0x60bd6a1f4000`，那就变成了：

+ `.fini_array[0] = base + 0x7345`
+ `.fini_array[1] = base + 0x2560`

也就是说：

+ 程序静态看起来退出函数是 `0x2500`
+ 但运行时第一个退出函数被改成了 `0x7345`

这才是真正的关键。

如果只停留在 `main` 的 `memcmp`，你得到的是“明线答案”；  
而真正决定 `Correct!` 的，是程序退出阶段那条隐藏逻辑。

---

## 三、真正的校验在 `0x7345`
把 `0x7345` 处的字节拿出来：

```latex
00007340: 48 83 c4 08 c3 f3 0f 1e fa e8 00 00 00 00 41 58
00007350: 49 83 e8 09 4d 89 c1 49 81 c0 6c b4 ff ff 48 c7
00007360: c1 2f 05 00 00 4d 31 d2 4d 31 db 45 8a 18 45 30
00007370: da 49 ff c0 e2 f5 4d 0f b6 d2 48 b8 01 01 01 01
00007380: 01 01 01 01 4c 0f af d0 49 8d b1 5b 52 00 00 49
00007390: 8d b9 89 00 00 00 b9 08 00 00 00 48 8b 06 4c 31
000073a0: d0 48 8b 1f 48 39 d8 75 24 48 83 c6 08 48 83 c7
000073b0: 08 ff c9 75 e6 b8 01 00 00 00 bf 01 00 00 00 49
```

整理成伪代码后，它的逻辑其实非常直接：

```c
void hidden_check() {
    uint8_t chk = 0;
    for (size_t i = 0; i < 0x52f; i++) {
        chk ^= main_bytes[i];
    }

    uint64_t mask = 0x0101010101010101ULL * chk;
    uint64_t *state = (uint64_t *)(base + 0xc5a0);
    uint64_t *blob  = (uint64_t *)(base + 0x73ce);

    for (int i = 0; i < 8; i++) {
        if ((state[i] ^ mask) != blob[i]) {
            return;
        }
    }

    write(1, "Correct!\n", 10);
}
```

所以隐藏目标是：

```latex
hidden_target = blob73ce XOR repeat_byte(chk)
```

其中：

+ `blob73ce` 是文件中 `0x73ce` 开始的 64 字节
+ `chk` 是对 `main` 那段代码做逐字节 XOR

这里一定要注意：

+ 不是字节求和
+ 是逐字节 XOR

对原始样本，有：

```latex
main = file[0x27b1 : 0x27b1 + 0x52f]
xor(main) = 0xe9
```

而我在调试用的补丁版上看到的是：

```latex
xor(main) = 0x15
```

这也是为什么很多中间现象会“看起来差一点点”的原因：一旦你 patch 了 `main`，隐藏期望值就一起变了。

对原始程序，真正的隐藏目标状态为：

```latex
4d95d2d6a07921024ea81cb440d8c3f669c606176957d497ce7f4eab279638d7e35bf397bd5ee3019f145f8d24744671a26861b1bebdb04df06e150000000000
```

这 64 字节才是最终要满足的目标，而不是 `0x80e0` 的那 43 字节常量。

---

## 四、回到明线核心：`0x41d9` 和 `0x5fef`
虽然 `memcmp` 不是最终校验，但 `0x41d9` 这条线仍然必须逆，因为隐藏检查最终比对的 `c5a0`，本质上还是这条变换链产出的状态。

### 1. `0x41d9` 的入口参数
从 `main` 调用点可知：

+ `rdi = rbp - 0x2880`：初始化好的大状态
+ `rsi = c3a0`：输入缓冲区
+ `rdx = c4a0`：输出缓冲区
+ `rcx = input_len * 8`
+ `r8  = [01 02 03 04 05 06 07 08]`
+ `r9  = 0x40`

本题输入长度固定为 43，所以：

```latex
bitlen = 43 * 8 = 344 = 0x158
```

### 2. 为什么会落到 `0x5fef`
继续逆 `0x41d9` 之后，会发现它会按 bitlen 选择不同的 case。

对 `0x158`，会落到：

```latex
case 4 -> 0x5fef
```

所以这题真正需要还原的，是：

+ `0x41d9` 的输入打包方式
+ `case 4` 下 `0x5fef` 的轮函数

### 3. 43 字节输入是怎么映射进状态的
这一步很关键。

输入不是简单当作字符串处理，而是被 pack 成 8 个 `uint64_t`：

+ 前 40 字节装入 `q0..q4`
+ `q5 = 0`
+ `q6 = 0`
+ 最后 3 字节装入 `q7` 的低 24 位

也就是说：

```python
def pack_input(payload: bytes) -> list[int]:
    q = [0] * 8
    for i in range(5):
        q[i] = u64_from_le(payload[i*8:(i+1)*8])
    q[5] = 0
    q[6] = 0
    q[7] = int.from_bytes(payload[40:43], "little")
    return q
```

这一点在后面逆回原始输入时非常重要。

---

## 五、如何把 `0x5fef` 还原出来
### 1. 先观察 `0x5fef` 调用现场
在进入 `0x5fef` 前断下，可以看到几个关键事实：

+ `rdi` 指向 `c5a0`
+ `rsi` 指向的不是用户输入，而是一个 8 qword 的小块
+ 这个小块首 qword 固定是：

```latex
0x0807060504030201
```

其余 qword 都是 0。

也就是说，`0x5fef` 的第二个参数实际是：

```python
CONST_ARR = [0x0807060504030201, 0, 0, 0, 0, 0, 0, 0]
```

### 2. case 4 对应的前后加表
把初始化后的大状态导出来，再定位到 case 4 的表，可以得到两组关键常量：

```latex
T1 =
d566bb2334d2bfa6
e81dd97efa73822e
06ef8337a4675129
26360ac5ff066ccf
300b171ce4ead624
5d36ffb834a38eef
4afd1b077ab4aee1
20e02f08f4cff0b2

T2 =
b9edd9087190ab07
9d3989f1c9be42ba
a6e81302d983e856
f849d8d7a07193f2
20756b748e7c4df9
140f746c58bb85b0
02b3a2b736acb9c1
f28b779f6e39dbfb
```

于是 case 4 的整体结构可以写成：

```python
raw   = pack_input(payload)
pre   = raw + T1
mid   = round_5fef(pre)
final = mid + T2
```

其中 `q7` 全程只保留低 24 位。

### 3. 一个很有用的不变量
对本题这个 case，`q5` 和 `q6` 在主轮里不会被修改。

它们只经历：

```latex
pre-add(T1) + post-add(T2)
```

这意味着你在还原时，`q5/q6` 可以作为校验模型是否正确的强约束。

### 4. `0x5fef` 主轮的精确 Python 模型
把它手翻成 Python 以后，核心轮函数如下：

```python
def round_5fef(s):
    q0,q1,q2,q3,q4,q5,q6,q7 = s
    for i in range(8):
        a = q0 & 0xff
        t1 = block[a]
        idx = (a + 3*i + 1) & 0xff
        t2 = block[idx]

        q1 = u64(q1 + t1)
        q0 = u64(q0 ^ (t2 << 8))
        t2 = u64(t2 ^ t1)
        q1 = u64(q1 + (t2 >> 5))
        q0 = u64(q0 - (t2 << 12))

        q7 = u64(q7 + t2)
        q7 = u64(q7 ^ q0)
        q7 &= ((1 << 24) - 1)

        q1 = u64(q1 + q7)
        q1 = u64(q1 ^ (q7 << 13))
        q0 = u64(q0 - (q7 >> 11))

        q0 = u64(q0 + const_arr[i])
        q1 = u64(q1 ^ const_arr[i ^ 1])
        q0 = u64(q0 + (q1 << (i + 9)))
        q1 = u64(q1 + ((BITLEN + MAGIC) & MASK64 ^ (q0 >> 3)))
        q0 = u64(q0 ^ (q1 >> 4))

        q0 = u64(q0 + const_arr[i ^ 2])
        e = const_arr[i ^ 4]
        q1 = u64(q1 + e)
        q1 = u64(q1 ^ (e >> 3))
        q1 = u64(q1 - (e << 5))
        q0 = u64(q0 ^ q1)

        q4 = u64(q4 - q2)
        q4 = u64(q4 ^ (q1 >> 10))
        q0 = u64(q0 ^ (q4 << 3))
        q4 = u64(q4 - (q2 << 6))
        q3 = u64(q3 + q4)
        q3 = u64(q3 ^ q2)
        q3 = u64(q3 - (q0 >> 7))
        q2 = u64(q2 ^ (q3 << 15))
        q3 = u64(q3 ^ (q1 << 5))
        q1 = u64(q1 + q3)
        q2 = u64(q2 ^ q1)
        q2 = u64(q2 + (q0 << 13))
        q1 = u64(q1 - (q2 >> 5))
        q2 = u64(q2 - (q1 >> 8))
        q0 = u64(q0 ^ q2)

        idx3 = (BITLEN + i*32 + 0x11) & 0xff
        q1 = u64(q1 ^ block[idx3])
        q1 = u64(q1 + (q0 << 19))
        q0 = u64(q0 - (q1 >> 27))
        q1 = u64(q1 ^ const_arr[i ^ 7])
        q7 = u64(q7 - q1)
        q0 = u64(q0 + ((q1 >> 5) & q1))
        q1 = u64(q1 ^ (q0 >> (q0 & 0x1f)))
        q0 = u64(q0 ^ block[q1 & 0xff])
    return [q0,q1,q2,q3,q4,q5,q6,q7]
```

这里：

+ `BITLEN = 344`
+ `MAGIC = 0x2B992DDFA23249D6`

这版模型我做过正反多轮对拍，是正确的。

---

## 六、为什么这题不一定要靠 SMT
一开始我也尝试过走 SMT：

+ 直接从 `0x41d9` 做符号执行
+ 或者对精简后的 qword 模型做位向量求解

但这题有一个更舒服的方向：

`0x5fef` 这轮是可逆的。

也就是说，不需要把 43 字节作为符号变量去“猜”，而是可以：

1. 先从隐藏检查算出最终目标 `final`
2. 逆掉 `T2`
3. 逆 `round_5fef`
4. 再逆掉 `T1`
5. 最后 unpack 回原始 43 字节输入

这一步的难点只在于：要把轮函数一条条倒着写回去。

但只要正向模型已经对拍成功，逆回去其实比 SMT 更稳。

---

## 七、从隐藏目标直接逆回原始输入
先得到隐藏目标状态：

```python
blob = bytes.fromhex(
    "a47c3b3f4990c8eba741f55da9312a1f802feffe80be3d7e"
    "2796a742ce7fd13e0ab21a7e54b70ae876fdb664cd9daf98"
    "4b818858575459a41987fce9e9e9e9e9"
)
chk = 0xE9
mask = bytes([chk]) * 64
hidden_state = bytes(a ^ b for a, b in zip(blob, mask))
```

也就是：

```latex
4d95d2d6a07921024ea81cb440d8c3f669c606176957d497ce7f4eab279638d7e35bf397bd5ee3019f145f8d24744671a26861b1bebdb04df06e150000000000
```

然后做三步：

```python
mid = hidden_state - T2
pre = inverse_round(mid)
raw = pre - T1
payload = unpack_input(raw)
```

最终逆出来的 43 字节原始输入是：

```latex
xmctf{The_0nly_cOns3ant_in_l1fe_isK_chAnge}
```

它是全可打印字符串，而且正是比赛最终可提交的 flag。

---

## 八、验证
最后直接把它喂给原始程序，输出为：

```latex
Please enter the flag: Follow 1782544616 meow~ Follow 1782544616 Thanks meow~
Correct!
```

也就是说：

+ 这串字符串不只是理论上满足隐藏状态
+ 它确实能在原始样本上走到真正的 `Correct!`

---

## 九、这题的关键经验
这题最值得记住的，不是某一条花哨指令，而是下面这几点：

### 1. 明线不一定是假线，但也不一定是终线
这题的 `main -> 0x41d9 -> memcmp` 不是烟雾弹，它是真的能逆。

但“能逆”不等于“就是最终答案”。

### 2. 程序生命周期要看全
如果只看 `main`，很容易默认“程序行为在 `return 0` 之前已经结束了”。

但这题真正的关键在：

+ `.fini_array`
+ `__cxa_atexit`
+ 运行时改写

所以一旦题目里出现这些信号，必须把初始化和退出阶段一起纳入分析范围。

### 3. Patch 会影响隐藏逻辑
这题里隐藏检查依赖 `main` 代码段自身的 XOR 值。

因此你为了调试而做的 patch，可能会顺手把隐藏目标也改掉。

这就是为什么：

+ 原始样本的 `chk = 0xE9`
+ 调试补丁版的 `chk = 0x15`

如果这一点没意识到，后面的比对会始终差一截。

### 4. 能逆的轮函数，优先考虑直接反推
这题完全可以硬上符号执行，但体验一般。

一旦把轮函数精确手翻出来，并且正向对拍通过，很多时候直接写逆过程，反而比 SMT 更快、更稳。

---

## 十、结语
我很喜欢这题，是因为它没有靠纯障眼法取胜。

明线是真的；  
明线也真的能算出答案；  
只是那不是最后一个答案。

它逼着解题者从“我已经把主逻辑逆完了”这件事里再迈一步，去确认：

+ 程序到底什么时候真正结束
+ 运行时有没有额外动作
+ 哪一个状态才是最后被消费的状态

从这个角度说，这题其实很“逆向”。

最后再写一遍最终 flag：

```latex
xmctf{The_0nly_cOns3ant_in_l1fe_isK_chAnge}
```

# 未解出2.WhisperLine Writeup
## 0x00 题目目标
题目给了两个核心文件：

+ `task.apk`
+ `Traffic.pcapng`

目标是：

1. 从 APK 里恢复加密实现。
2. 从 PCAP 里重组出加密聊天记录。
3. 拿到私钥或等价解密能力。
4. 还原完整明文对话。

最终脚本见同目录下的 `whisperline_solve.py`。

## 0x01 APK 侧快速定位
先用 `jadx` / `apktool` 解包：

```bash
jadx -d jadx_out task.apk
apktool d -f task.apk -o apktool_out
```

应用自己的代码非常少，核心只看两个文件：

+ `jadx_out/sources/com/example/polarisctf/MainActivity.java`
+ `jadx_out/sources/com/example/polarisctf/Z.java`

### 1. MainActivity：协议和发送逻辑
在 `MainActivity.java:L40-L66` 可以看到：

+ 所有网络数据都先转成 UTF-8 字节
+ 再编码成十六进制字符串发送
+ 接收时再尝试从十六进制转回普通字符串

也就是说，PCAP 里抓到的 TCP payload 其实是“ASCII 明文协议的 hex 包装”。

发送消息的关键代码在 `MainActivity.java:L141-L148`：

```java
Z z = Z.INSTANCE;
byte[] bytes = $msg.getBytes(Charsets.UTF_8);
String ct = z.x(bytes);
$ww.write(this$0.strToHex("MSG " + $to + " " + ct + "\n"));
```

因此聊天协议已经很清楚：

+ 连接后发送：`HELLO <name>\n`
+ 发消息时发送：`MSG <to> <ciphertext>\n`

连接逻辑在 `MainActivity.java:L158-L185`，能看到 `HELLO` 的发送。

接收逻辑在 `MainActivity.java:L193-L224`，只会把收到的 `FROM user ct` 直接显示出来，并不会解密。

这说明：

+ APK 里只有“加密端”
+ 没有直接可用的解密实现

### 2. Z.java：加密在 native
`Z.java:L9-L19` 非常短：

```java
public final class Z {
    public static final Z INSTANCE = new Z();

    public final native String x(byte[] b);

    static {
        System.loadLibrary("u");
    }
}
```

所以真正的加密逻辑在：

+ `lib/arm64-v8a/libu.so`

## 0x02 PCAP 协议重组
由于 payload 是 hex 包一层文本协议，解析思路很简单：

1. 提取 TCP payload。
2. 对每个 payload 做 `bytes.fromhex(...).decode()`。
3. 只看发往 `9001` 端口的客户端消息。

重组后可以得到两位用户：

+ `Adic`
+ `December`

以及共 18 条客户端发送的加密消息，顺序如下：

1. `Adic -> December`
2. `December -> Adic`
3. `Adic -> December`
4. `December -> Adic`
5. `Adic -> December`
6. `December -> Adic`
7. `Adic -> December`
8. `December -> Adic`
9. `Adic -> December`
10. `December -> Adic`
11. `Adic -> December`
12. `December -> Adic`
13. `Adic -> December`
14. `December -> Adic`
15. `Adic -> December`
16. `December -> Adic`
17. `Adic -> December`
18. `December -> Adic`

这一步已经被自动化写进 `whisperline_solve.py` 里。

## 0x03 Native 逆向：恢复加密逻辑
在 `libu.so` 里能找到 JNI 导出：

+ `Java_com_example_polarisctf_Z_x`

以及一批很关键的字符串：

+ `java/math/BigInteger`
+ `modPow`
+ `toByteArray`
+ `bitLength`
+ `compareTo`
+ `valueOf`
+ `mod`

结合反汇编可以恢复出完整流程：

1. 从 `libu.so` 中取一段 256 字节数据。
2. 每个字节与 `0xA7` 异或，得到模数 `n`。
3. 令公钥指数 `e = 65537`。
4. 明文字节 `b` 被解释为正整数 `m = BigInteger(1, b)`。
5. 若 `m >= n`，则先做 `m = m mod n`。
6. 计算 `c = m^e mod n`。
7. 将 `c` 转成定长 256 字节。
8. 最后把字节序反转，再转成 hex 输出。

也就是：

```latex
c = pow(m, 65537, n)
output = hex(reverse(left_pad_256_bytes(c)))
```

这不是带填充的 RSA，而是裸 textbook RSA，外加一个“小端 hex 输出”的格式层。

## 0x04 模数提取
从 `arm64-v8a/libu.so` 的偏移 `0x16B39` 读取 256 字节，逐字节异或 `0xA7`，即可得到模数。

脚本里对应常量：

```python
LIB_MEMBER = "lib/arm64-v8a/libu.so"
MOD_BLOB_OFFSET = 0x16B39
MOD_BLOB_LEN = 256
MOD_BLOB_XOR = 0xA7
PUB_E = 65537
```

恢复出的模数为：

```latex
1359289594911861706114410263039030781889501874535854365263922081700238941971104298775704733565166223684142297360239921080802503206559783832007855750334958326368538063619171609885459927586035302195455632768752776216956554963499448005445126927786242177611054827389185330231903625073278897391670581843035646913248732183168634640757720768465749375619368398241192399373901594871829578828976563808877743744957547821735170186252185438724528024345696208656639600908162373375395068724897936084947703562847353279296559280237330305142321357271051046159817216535038453709580872952011626071015235951428711736008848437349560705229
```

位数：

+ `2044 bits`

## 0x05 解密思路
既然 APK 里没有私钥，想还原明文只能：

1. 分解模数 `n`
2. 计算 `lambda(n)` 或 `phi(n)`
3. 反算私钥 `d = e^{-1} mod lambda(n)`
4. 对每条密文做 `m = c^d mod n`

脚本里已经实现了通用解密逻辑：

```python
calc_n, d = build_private_exponent(factors, PUB_E)
pt = decrypt_message(ct_hex_le, d, n)
```

不过这题还有一个非常重要的副路线：

+ 这是 **deterministic textbook RSA**
+ 公钥 `n, e` 完全可从 APK 恢复
+ 因此我们可以把候选明文重新加密，再和 PCAP 中的密文逐条比较

也就是说，哪怕还没有分解 `n`，也可以先做 **public-key dictionary attack**，撞出一部分短消息明文。

## 0x06 公钥撞词典
由于没有随机填充，所以：

```latex
same plaintext -> same ciphertext
```

脚本现在支持：

```bash
python whisperline_solve.py --guess-file guesses.txt
```

其中 `guesses.txt` 是“每行一个候选短句”的词典。

先用常见短回复做匹配，已经可以稳定命中 4 条消息：

1. 第 2 条：`yes`
2. 第 4 条：`understood`
3. 第 16 条：`done`
4. 第 18 条：`ok`

当前已确认的对话骨架如下：

```latex
01. Adic -> December: ?
02. December -> Adic: yes
03. Adic -> December: ?
04. December -> Adic: understood
05. Adic -> December: ?
06. December -> Adic: ?
07. Adic -> December: ?
08. December -> Adic: ?
09. Adic -> December: ?
10. December -> Adic: ?
11. Adic -> December: ?
12. December -> Adic: ?
13. Adic -> December: ?
14. December -> Adic: ?
15. Adic -> December: ?
16. December -> Adic: done
17. Adic -> December: ?
18. December -> Adic: ok
```

这说明：

+ 对话的风格确实是简短英文短句
+ `December` 明显更像执行方 / 响应方
+ 即使还没完整分解，也可以继续靠更大的候选词典去扩大已知明文锚点

## 0x07 部分因子也能先试解密
脚本现在还支持“只拿到部分因子先试解密”。

原因是：

+ 如果已经拿到某个质因子 `p`
+ 并且某条消息对应的明文整数 `m < p`
+ 那么只在模 `p` 下做 RSA 解密，得到的其实就已经是完整 `m`

所以对足够短的消息来说，**有时拿到一个足够大的小因子就够了**，不一定非得等整个 `n` 完全分解。

## 0x08 因数分解
这一题的真正难点在这里。

我这里采用的路线是：

1. 用 `yafu-x64.exe` 对恢复出来的 2044-bit 模数做 ECM / P-1 预处理。
2. 找到非平凡因子后，检查剩余 cofactor 是否为素数。
3. 若 cofactor 仍然合数，则继续分解直到完全分解。

当前已经确认过：

+ 两轮独立的 `1M / t35` ECM 仍然没有打出因子
+ 因此最小因子大概率不在最容易的 `~35 digits` 档位
+ 后续更合理的继续方向是 `3M / t40` 级别 ECM

常见命令形态：

```bash
yafu-x64.exe "factor(N)" -threads 32 -one -plan deep -pretest 40 -work 35.555956 -seed 94949494 -v
```

其中：

+ `N` 是从 APK 里恢复的模数
+ `-work 35.555956` 表示从现有的 `t35.56` 预处理深度继续
+ `-pretest 40` 表示目标推进到 `t40`

> TODO：在此补充分解得到的全部因子，以及具体耗时。
>

## 0x09 明文恢复
> TODO：在此补完整明文对话。
>

## 0x0A 复现脚本用法
当前脚本：

+ 自动从 APK 提取模数
+ 自动从 PCAP 重组消息顺序
+ 支持公钥候选短句匹配
+ 支持传入完整因子列表后自动解密

基础用法：

```bash
python whisperline_solve.py
```

只会输出：

+ 模数
+ 消息数量
+ 18 条密文时间线

公钥撞词典用法：

```bash
python whisperline_solve.py --guess-file guesses.txt
```

例如 `guesses.txt` 内容可以是：

```latex
yes
understood
done
ok
```

脚本会把能命中的真实消息打印出来。

完整解密用法：

```bash
python whisperline_solve.py --factors "p1,p2,..."
```

脚本会：

1. 计算私钥指数 `d`
2. 按时间顺序解密全部 18 条消息
3. 打印完整对话

部分因子试解密：

```bash
python whisperline_solve.py --factors "p_partial"
```

如果提供的因子乘积还原不出完整 `n`，脚本会进入 partial mode，并明确提示：

+ 当前只是在模“部分乘积”下解密
+ 只有当明文整数小于这个部分模数时，结果才是精确明文

## 0x0B 脚本实现说明
脚本当前已经实现：

1. `extract_modulus_from_apk`  
从 `task.apk` 中读取 `libu.so`，自动恢复模数。
2. `iter_pcapng_epb_packets`  
纯标准库解析 `pcapng`。
3. `extract_messages`  
自动从 `HELLO` 记录学出用户名，再按时间顺序提取 `MSG <to> <ct>`。
4. `encrypt_plaintext_to_le_hex`  
复现 native 里的 textbook RSA 加密，支持做公钥撞词典。
5. `match_candidates`  
用候选短句列表去匹配 PCAP 中的真实密文。
6. `build_private_exponent`  
用完整或部分因子列表恢复 `d`。
7. `decrypt_message_int`  
正确处理“小端 hex 密文 -> 大整数 -> RSA 解密”。

## 0x0C 小结
这题的核心不是流量分析，而是：

+ 从 APK 确认这是 **裸 RSA**
+ 注意输出格式是 **固定 256 字节 + 小端序 hex**
+ 可以先通过 **公钥撞词典** 拿到一部分明文锚点
+ 最后再通过 **完整分解模数** 或者 **足够大的部分因子** 恢复更多对话

剩下只差把分解结果和最终对话补进来即可形成完整题解。
