# 1.greetings
题目格式为exe，先exeinfo查看文件格式，64位无壳程序，直接IDA查看

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747303186309-7c741a95-d7a0-49d0-a91e-577d5dfbe70f.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747303747781-17f50499-b516-46e6-9e48-50d8f0d9c159.png)

main函数没藏，直接看即可，先从140001220开始看起

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747305735474-9fdbe9a0-8a31-451f-b2d2-4afab57e9cff.png)

开头检查是否有调试器存在，如果有的话，会执行一些反调试措施，同时看到_mm_load_si128加载了xmmword_14001B390，用于后面的比较

接下来是一段处理输入数据的循环。这里有很多关于字符编码的处理，变量v4指向输入数据的开始，v2是结束指针。循环中逐个处理字符，检查是否是空格或者控制字符

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747306557385-75457b02-b6bf-43b4-b79c-14e5f15b96eb.png)

处理完上面的部分之后可以继续往下看，之后进入加密或解密流程。其中有一个异或操作和循环移位：v31 = ROL1(v27[i] ^ (i + 90), i - 5 * v30)。这里，v27可能指向处理后的输入数据，i是索引，每次循环处理一个字节。ROL1是循环左移，参数是移动的位数

然后，将处理后的数据存储在某个缓冲区中，之后使用_mm_cmpeq_epi8比较处理后的数据是否与之前加载的si128（即xmmword_14001B390）相等。如果全部相等（即movemask结果为0xFFFF），则跳转到v42成功分支

接下来按照加密逻辑写代码即可，密文显而易见就是xmmword_14001B390

```python
# -*- coding: utf-8 -*-
def rotate_right(val, bits):
    bits %= 8
    return ((val >> bits) | (val << (8 - bits))) & 0xFF

# 密文：16字节
cipher_bytes = [
    0x13, 0x10, 0x7C, 0xF0, 0x52, 0x30, 0x7C, 0x1C,
    0x72, 0x75, 0x41, 0x96, 0xC8, 0xE2, 0x00, 0x14
]

plain = bytearray()

for idx, ch in enumerate(cipher_bytes):
    offset = idx % 5
    temp = rotate_right(ch, offset)
    decoded = temp ^ (idx + 90)
    plain.append(decoded)

try:
    result = plain.decode('utf-8')
except UnicodeDecodeError:
    result = plain.decode('utf-8', errors='replace')

print("Recovered:", result)
```

# 2.有趣的小游戏
exeinfo查看，无壳64位直接IDA即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747306885930-fc1a10c1-aa56-4a73-9ea7-a10996596df4.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747308505915-84293938-56a8-4aeb-97ae-5da93a114a2c.png)  
看代码，从动调可知程序打开之后如下

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747308556525-1e9afc79-dcbf-4995-8a10-46ba1c528c96.png)

算是一种迷宫题目变体，因此着重于寻各个数据的存储位置以及收集金币遇到的事件，从上往下看先是41D820

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747339154541-c09b00f7-d15b-4c12-9b09-6d8ae085b61a.png)

是有关绘制地图和记录已收集金币的函数，后面还有有关读取输入相关的4a3a70函数等

比较重要的是41D620函数

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747386364469-76f0aa7f-8cf7-46aa-9925-3189c9c60259.png)

在外层即可看到函数内部存在部分判断条件

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747386743733-08afae9e-d666-4358-91f2-a3fe132b0be7.png)

从上至下分别是移动位置和撞墙检测，进入d580继续看

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747388103219-5e2dd3a9-fed8-46d0-b05d-22574e13cfb7.png)

可以观察到580中的40165D函数调用了两个file，其中一个定义了v4，可以动调看看v4具体是个什么内容

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747388811641-f5aa4a8a-afc4-4e90-a5ad-b7372d38bf23.png)

file2转换过来的汇编可以看出满足条件会跳转到1F00EF，继续追过去看

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747389267439-8128e282-ec44-4c1d-88b2-e434643b7a75.png)

下端出现了一个非常耐人寻味的数字，0x9E3779B9，经典tea类型delta了，因此就可以逐行解析上方代码

```plain
mov     dword ptr [rsp+8], 0    ; 初始化循环计数器为0
jbe     loc_1F00EF              ; 若计数器超过阈值则跳出循环
```

+ `<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">[rsp+8]</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> </font><font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">存储循环计数器</font><font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">j</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">，初始化为</font><font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">0</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">。</font>
+ `<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">jbe</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> 判断循环终止条件</font>

```plain
mov     rax, [rsp+18h]          ; 加载数据数组指针
mov     ecx, [rsp+8]            ; 加载当前索引 j
sub     ecx, 1                  ; j = j-1
mov     eax, [rax+rcx*4]        ; 读取 v[j-1] 的值
mov     [rsp+10h], eax          ; 保存 v[j-1] 到临时变量
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">计算数组元素 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">v[j-1]</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> 的地址</font>
+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">将 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">v[j-1]</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> 存入栈临时变量 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">[rsp+10h]</font>`

```plain
shr     r8d, 5                  ; v[j] >> 5
shl     eax, 2                  ; v[j-1] << 2
xor     r8d, eax                ; (v[j] >> 5) ^ (v[j-1] << 2)

shr     eax, 3                  ; v[j-1] >> 3
shl     ecx, 4                  ; v[j] << 4 (来自之前的操作)
xor     eax, ecx                ; (v[j-1] >> 3) ^ (v[j] << 4)

add     r8d, eax                ; 合并位混淆结果
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">实现 XXTEA 解密中的位混淆逻辑：</font>
    - `<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">part1 = (v[j] >> 5) ^ (v[j-1] << 2)</font>`
    - `<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">part2 = (v[j-1] >> 3) ^ (v[j] << 4)</font>`
    - `<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">sum = part1 + part2</font>`

```plain
xor     eax, [rsp+14h]          ; total ^ v[j]
mov     ecx, [rcx+rdx*4]        ; 加载密钥 key[(j & 3) ^ e]
xor     ecx, [rsp+10h]          ; key[...] ^ v[j-1]
add     eax, ecx                ; (total ^ v[j]) + (key[...] ^ v[j-1])

xor     r8d, eax                ; sum ^ ((total ^ v[j]) + (key[...] ^ v[j-1]))
sub     eax, r8d                ; v[j] -= (sum ^ ...)
mov     [rcx+rdx*4], eax        ; 更新 v[j]
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">计算 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">part3 = (total ^ v[j]) + (key[...] ^ v[j-1])</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"></font>
+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">最终操作 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">v[j] -= (sum ^ part3)</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">，完成一轮解密。</font>

```plain
mov     eax, [rsp+8]            ; 加载当前索引 j
add     eax, 0FFFFFFFFh         ; j -= 1
mov     [rsp+8], eax            ; 更新计数器
jmp     loc_1F005C              ; 继续循环
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">逆向遍历数组（从高位向低位），直到处理完所有元素。</font>

```plain
mov     rax, [rsp+18h]          ; 加载数据数组指针 v
mov     ecx, [rsp+24h]          ; 获取当前数据块索引
sub     ecx, 1                  ; 索引 j = j-1
movsxd  rcx, ecx                ; 符号扩展为64位
mov     eax, [rax+rcx*4]        ; 读取 v[j-1]
mov     [rsp+10h], eax          ; 临时存储 v[j-1]
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">加载 </font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">v[j-1]</font>`<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> 到临时变量，为后续位操作准备</font>

```plain
shr     edx, 5                  ; v[j-1] >> 5
shl     eax, 2                  ; v[j] << 2
xor     edx, eax                ; (v[j-1] >>5) ^ (v[j] <<2)

shr     eax, 3                  ; v[j] >>3
shl     ecx, 4                  ; v[j-1] <<4
xor     eax, ecx                ; (v[j] >>3) ^ (v[j-1] <<4)

add     edx, eax                ; 合并结果 sum_part = part1 + part2
xor     eax, [rsp+14h]          ; total ^ v[j]
mov     ecx, [rcx+r8 * 4]         ; 加载密钥 key[...]
xor     ecx, [rsp+10h]          ; key[...] ^ v[j-1]
add     eax, ecx                ; (total ^ v[j]) + (key[...] ^ v[j-1])

xor     edx, eax                ; sum_part ^ mix
sub     eax, edx                ; v[j] -= (sum_part ^ mix)
mov     [rcx], eax              ; 更新 v[j]
```

+ **<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">这段简单来说就是</font>**<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">：</font>

```plain
sum_part = ((v[j-1] >>5) ^ (v[j] <<2)) + ((v[j] >>3) ^ (v[j-1] <<4))
v[j] -= (sum_part ^ ((total ^ v[j]) + (key[...] ^ v[j-1])))
```



最后这段

```plain
sub     eax, 9E3779B9h          ; total -= delta (0x9E3779B9)
mov     [rsp+0Ch], eax          ; 存储更新后的 total
add     eax, 0FFFFFFFFh         ; 轮次计数器 i--
cmp     eax, 0                  ; 检查轮次是否完成
jnz     loc_1F0044              ; 继续循环
```

+ <font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">控制外层循环轮次（典型为 6 + 52/n 轮）</font>

<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">在这之后就可以反写xxtea的代码了，解密代码如下</font>

```plain
# -*- coding: utf-8 -*-
import base64 
import struct
from ctypes import c_uint32

def xxtea(n, v, key): 
    v = [c_uint32(i) for i in v] 
    r = 6 + 52 // n
    v0 = v[0].value 
    delta = 0x9e3779b9
    total = c_uint32(delta * r) 
    for i in range(r):
        e = (total.value >> 2) & 3 
        for j in range(n-1, 0, -1):
            v1 = v[j-1].value
            v[j].value -= ((((v1 >> 5) ^ (v0 << 2)) + ((v0 >> 3) ^ (v1 << 4))) ^((total.value ^ v0) + (key[(j & 3) ^ e] ^ v1))) 
            v0 = v[j].value
        v1 = v[n-1].value
        v[0].value -= ((((v1 >> 5) ^ (v0 << 2)) + ((v0 >> 3) ^ (v1 << 4))) ^ ((total.value^ v0) + (key[(0 & 3) ^ e] ^ v1))) 
        v0 = v[0].value 
        total.value -= delta
    return [i.value for i in v]
k = [0x12345678, 0x9ABCDEF0, 0xFEDCBA98, 0x76543210]
l = 30
v = [3289780790, 3303769414, 166977647, 3675092628, 4028141524,51857725, 1221687057, 3215121239, 2352885504,-2003557313,767602242, -956223068, -1590701659, -1310700808, 1350178986,-1356852109, 1385003088, 2126125270, 1749773324, 988335585,319731345, -711350358,  -2090852781, 1411912721,-606882706,1791589729, 96648406, 1037884418, 1944664939, 1850416770]
for i in range(20000):
    v = xxtea(l, v, k) 
    out = b"".join([struct.pack("<I", i) for i in v])
    try:
        print(out.decode())
        print("".join([chr(out[i:i+4][0]) for i in range(0, len(out), 4)]), end="") 
    except:
        continue
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1747390020965-a053353a-8d33-4af6-965f-552ae070685c.png)

运行即可得到flag`ISCC{:03>W17^{@\=7Y#r[0Ty[JVx}`

<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"></font>

<font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);">  
</font><font style="color:rgba(0, 0, 0, 0.9);background-color:rgb(252, 252, 252);"> </font>











