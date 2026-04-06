前三题秒杀题懒得写了

## 4.catch
ida打开

shift f12搜索相关字段

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766194176579-6772f74c-0390-45c5-a3d1-c2b619bf7980.png)

看到疑似加密过的flag

zbrpgs{F4z3_Ge1px_jvgu_@sybjre_qrfhjn}

ctrl x查找调用，无果

可以发现这里是一个比较巧妙的利用try抛出异常做的一个junk code，这里把try全部nop掉

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766194483842-ee29c006-7637-4823-b80d-064bc0ea9bb4.png)

找到了类似flag的文本

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766194744720-921860cd-419c-4440-a30b-cc297b27753b.png)

经过查找主程序发现加密脚本

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766196475683-9664d075-a2c3-4e09-af4b-300c5439f088.png)

位移13位的只对字母编码的凯撒密码

简称rot13，进入cyberchef

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766196573278-ad6aeaab-55d7-4177-bd0e-1f843f9a1750.png)

得到flag

moectf{S4m3_Tr1ck_with_@flower_desuwa}

## 5.moe
鉴于是新生赛直接拆壳看看，盲猜不是魔改壳

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766197010459-fa3f2cec-191c-4a0a-920c-92d8669014e6.png)

啊，一遍就成功了

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766197177827-ecfcfbfd-a702-4fec-9645-bc2be982feed.png)

exeinfo显示没有壳了，直接IDA启动

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766198512675-1aced7e6-5b8a-459b-9280-7256879d492c.png)

分析程序可得，在程序处理完之后将答案处理后数据v14数组和v10数组中的相应数字做比较，v10是利用指令集存储的大数需要手工拆解

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766198663138-97c86f47-9644-4c46-855a-0bf9173277c5.png)

顺序为e 1 2 f d b 0 c

故为0x23,0x2b,0x27,0x36,0x33,0x3c,0x03,0x48,0x64,0x0b,0x1d,0x76,0x7b,0x10,0x0b,0x3a,0x3f,0x65,0x76,0x29,0x15,0x37,0x1c,0x0a,0x08,0x21,0x3E,0x3c,0x3d,0x16,0x0b,0x24,0x29,0x24,0x56

加密逻辑为数组内的所有元素均与0x21xor后，后者与前者依次xor

考虑到逻辑上而言假设一个数组有a b c三个数，第一次操作后会得到与0x21xor后的结果d e f， 再后会得到dxorf，exorf，f，在之后会得到(dxorf)xor(exorf) exorf f，其中第一项xorf可以消去得到dxore

所以逻辑很清晰了，就是最后一项xor0x21后再xor前一项



```plain
#include <stdio.h>

int main() {
	char enc[35] = { 0x23,0x2b,0x27,0x36,0x33,0x3c,0x03,0x48,0x64,0x0b,0x1d,0x76,0x7b,0x10,0x0b,0x3a,0x3f,0x65,0x76,0x29,
		0x15,0x37,0x1c,0x0a,0x08,0x21,0x3E,0x3c,0x3d,0x16,0x0b,0x24,0x29,0x24,0x56 };
	char flag[36];
	flag[35] = '\n';
	for (int i = 34; i >= 0; i--) {
		flag[i] = enc[i] ^ 0x21 ^ flag[i + 1];
	}
	for (int i = 0; i <= 34; i++) {
		printf("%c", flag[i]);
	}
	return 0;
}
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766201601279-a3d8b3c3-cd31-4c09-bd99-ac72b674bdc0.png)

得到flagmoectf{Y0u_c4n_unp4ck_It_vvith_upx}

## 6.z3solver
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766236397159-7d4b3b33-d311-4ce2-916a-ccb32d2555a1.png)

文件是elf格式

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766236602551-8120169c-371b-4faa-b46b-1da58e077502.png)

打开文件可以找到

## 7.ez android
喷不了，这是真的ez

首先拖进Jadx看情况

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766767006287-d32db812-5d46-4f68-b74c-7537e43b82cc.png)

进入Manifest查看情况，一般而言安卓的相关情况都在Mainactivities里，直接进去看即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766767045520-b822344b-9f2c-49a3-a9b5-47c2db16b31c.png)

观察到base64的加密逻辑，并不是魔改base64，直接cyberchef解密即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766767073769-cc9776a6-1a4f-47ff-a22e-b76c6db63621.png)

得到flag

moectf{android_Reverse_I5_easy}

## 8.flower
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766767157301-1df0af9e-d9cb-4f5a-a976-7675aeeb3929.png)

拿到这样一个文件，先查查成分

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766767195757-061e3812-22c5-4875-b516-5f6bf351fdc6.png)

无壳elf，直接IDA雅座一位

## 9.2048_Master
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766815906395-4fff6cdf-a4ed-477e-9195-d9d094350f8c.png)

exeinfo打开可见无壳64位exe文件

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766817920543-d42b5a5d-3102-4356-9fbf-3cd585a799d6.png)

进入IDA不难看出是XXTEA，懒得写解密代码

小游戏可以用CE解决

但是开场扫2一直扫不出来，点几下之后2能扫但是4扫不出来

推测是指数存储现场计算的

故而多次扫描之后直接改成14即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766817966750-d0e9434a-2f2a-4fa9-87f8-68c487fc3602.png)

得到flag moectf{Y0u_4re_a_2048_m4st3r!!!!r0erowhu}

但是这是misc的flag，re得硬拆

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766820331481-471096a6-c750-4563-8a94-19ce67449379.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766820372762-75bdc2c7-5371-4b6c-b2ab-75237eaad148.png)

观察这段解密代码，可以看出具体的算法没有被更改，是一个比较标准的tea加密（在中间没有加入块运算或者其他的可逆运算）

解密TEA系列所需要的三个要素：delta，key和密文，写标准解密代码即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766820532568-90b38ac5-fa7c-4c4a-9085-e7c3b0545850.png)

此处转换为16进制就是delta值0x3E9779B9，得到了delta

由上图逻辑不难得知a3指针的位置就是key；a1指针的位置对应密文，交叉引用两次到达最外层校验函数

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766821542044-b4dad9cf-8205-467c-a545-b758ba525807.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766821566836-b00f1772-bf23-4aec-b8cd-8f7ac51bc8c6.png)

v4位置被strcpy了2048master2048ma，对应a3，易得这个就是key的str表出

校验处可以得到密文（也就是Block+i处），byte数组

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766821713210-deb6ff84-73cc-4733-bec7-05ab69a28924.png)



```plain
unsigned char ida_chars[] =
{
  0x35, 0x79, 0x77, 0xCC, 0x1B, 0x13, 0x41, 0x34, 0xF9, 0xFF, 
  0x9F, 0x91, 0xFF, 0x5B, 0x94, 0x78, 0x86, 0x2A, 0xAF, 0xAE, 
  0xD7, 0x9E, 0x31, 0x4D, 0x7A, 0xC4, 0xA5, 0x51, 0xD1, 0xD9, 
  0x6E, 0x44, 0x18, 0x52, 0x86, 0x1B, 0x42, 0x8A, 0xC9, 0x63,}
```

三要素齐全，撰写标准xxtea解密程序即可

```plain
import struct


def xxtea_decrypt(data_list, key, delta):
    n = len(data_list)
    if n < 2: return data_list

    # 计算轮数与初始 sum
    rounds = 6 + 52 // n
    sum_val = (delta * rounds) & 0xFFFFFFFF

    # XXTEA 解密核心逻辑
    v19 = data_list[0]
    for _ in range(rounds):
        e = (sum_val >> 2) & 3
        # 从后往前解
        for i in range(n - 1, 0, -1):
            v16 = data_list[i - 1]
            term1 = (((v19 << 2) & 0xFFFFFFFF) ^ (v16 >> 5)) + (((v19 >> 3) ^ ((v16 << 4) & 0xFFFFFFFF)))
            term2 = (v19 ^ sum_val) + (v16 ^ key[(i & 3) ^ e])
            data_list[i] = (data_list[i] - (term1 ^ term2)) & 0xFFFFFFFF
            v19 = data_list[i]

        v17 = data_list[n - 1]
        term1 = (((v19 << 2) & 0xFFFFFFFF) ^ (v17 >> 5)) + (((v19 >> 3) ^ ((v17 << 4) & 0xFFFFFFFF)))
        term2 = (v19 ^ sum_val) + (v17 ^ key[(0 & 3) ^ e])
        data_list[0] = (data_list[0] - (term1 ^ term2)) & 0xFFFFFFFF
        v19 = data_list[0]

        sum_val = (sum_val - delta) & 0xFFFFFFFF
    return data_list


# --- 参数配置 ---

# 1. 密文数据 (40字节)
HEX_CIPHER = [
    0x35, 0x79, 0x77, 0xCC, 0x1B, 0x13, 0x41, 0x34, 0xF9, 0xFF, 0x9F, 0x91, 0xFF, 0x5B, 0x94, 0x78,
    0x86, 0x2A, 0xAF, 0xAE, 0xD7, 0x9E, 0x31, 0x4D, 0x7A, 0xC4, 0xA5, 0x51, 0xD1, 0xD9, 0x6E, 0x44,
    0x18, 0x52, 0x86, 0x1B, 0x42, 0x8A, 0xC9, 0x63
]

# 2. 答案给出的 Key 和 Delta
# 将 16 字节字符串转为 4 个 32 位整数（小端序）
key_bytes = b'2048master2048ma'
CUSTOM_KEY = list(struct.unpack("<4I", key_bytes))
CUSTOM_DELTA = 0x3E9779B9

# --- 执行解密 ---
cipher_bytes = bytes(HEX_CIPHER)
# 每4字节转为一个32位无符号整数
v_list = list(struct.unpack("<" + str(len(cipher_bytes) // 4) + "I", cipher_bytes))

decrypted_v = xxtea_decrypt(v_list, CUSTOM_KEY, CUSTOM_DELTA)

# 将整数列表转回字节流
final_bytes = struct.pack("<" + str(len(decrypted_v)) + "I", *decrypted_v)
print(f"Flag : {final_bytes.decode('utf-8', errors='ignore')}")
```

运行

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766821847497-34030c20-72f1-4777-a409-fbc9f9d29694.png)

得到re组的实际flag

moectf{@_N1c3_cup_0f_XXL_te4_1n_2O48}

## 10.a_cup_of_tea
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766822599427-df63252d-c789-4951-b5b4-f9d2bae2e2ea.png)

exeinfo查成分，无壳exe，IDA雅座一位

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766841444969-701df1d8-1194-4bf7-a3a2-14ef5b753802.png)

观察结构和长度，非常显然的v5是key，v6是密文

进入sub14001109B找到加密结构

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766841834083-f801fc6f-14ed-483d-bc6f-818fe6ebe626.png)

32轮标准的tea加密，delta是114514，直接gadgets标准tea一把梭就行

```plain
# 1. 整理来自 IDA 的密文数据 (v6)
# 将有符号整数转为无符号并打包成字节流
v6_raw = [
    2026214571, 578894681, 1193947460, -229306230,
    73202484, 961145356, -881456792, 358205817,
    -554069347, 119347883
]
# 使用小端序 '<' 和 无符号整数 'I' 转换
data = b"".join([struct.pack("<i", x) for x in v6_raw])

# 2. 整理来自 IDA 的密钥 (v5)
v5_raw = [289739801, 427884820, 1363251608, 269567252]
key = b"".join([struct.pack("<I", x) for x in v5_raw])
# 3. 设置魔改的 Delta
# 题目中明显到处都是 114514
custom_delta = 0x114514
# 4. 调用 regadgets 解密
# 注意：大部分 CTF 库默认 TEA 轮数为 32 轮
try:
    flag = regadgets.tea_decrypt(data, key, delta=custom_delta)

    # 打印结果
    print("解密后的字节码:", flag)
    print("Flag:", flag.decode(errors='ignore').strip('\x00'))
except Exception as e:
    print(f"解密出错: {e}")
```

## ezpy
可以发现是pyc程序，故而需要pycdc解除压缩，但是pycdc解除不全，找了网站解密如下

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766842598833-0d2404b2-a09c-4e2c-8884-8388d1ebd3c4.png)

```plain
def caesar_cipher_encrypt(text, shift):
    result = []
    for char in text:
        if char.isalpha():
            if char.islower():
                new_char = chr((ord(char) - ord('a') + shift) % 26 + ord('a'))
            else:
                if char.isupper():
                    new_char = chr((ord(char) - ord('A') + shift) % 26 + ord('A'))
            result.append(new_char)
        else:
            result.append(char)
    else:
        return ''.join(result)
 
 
user_input = input('please input your flag：')
a = 1
if a != 1:
    plaintext = user_input
    shift = 114514
    encrypted_text = caesar_cipher_encrypt(plaintext, shift)
    if encrypted_text == 'wyomdp{I0e_Ux0G_zim}':
        print('Correct!!!!')
```

位移114514个

114514 % 26 = 10，故而实质上是每个字符往前位移了十位的同时符号不动（有点rot13的感觉，但不是），故而直接写解密代码即可

其实都不用写，在原本的代码上稍微改一下就好了

```plain
def caesar_cipher_encrypt(text, shift):
    result = []
    for char in text:
        if char.isalpha():
            if char.islower():
                new_char = chr((ord(char) - ord('a') - shift) % 26 + ord('a'))
            else:
                if char.isupper():
                    new_char = chr((ord(char) - ord('A') - shift) % 26 + ord('A'))
            result.append(new_char)
        else:
            result.append(char)
    else:
        return ''.join(result)

plaintext = 'wyomdp{I0e_Ux0G_zim}'
shift = 114514
encrypted_text = caesar_cipher_encrypt(plaintext, shift)
print(encrypted_text)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766846029364-609ca436-bec7-4dd4-940e-944eb5c314aa.png)

运行代码得到flag

moectf{Y0u_Kn0W_pyc}

## windows
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766846317294-da0bbc92-3ae1-4a7f-8e1b-6d173bfa5eaa.png)

很遗憾，点击交互并让我输入flag

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766846443681-e5850e68-7d07-45d5-9f2b-42f67720858b.png)

64位无壳无签名，IDA雅座一位

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766847167769-5c4e26f0-62f0-44ea-aaaa-b90b4bdb619b.png)

阅读汇编语言找到加密逻辑所在字段，可得加密就是

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766847491859-fb9e224f-e3c5-4d5c-881c-8d2c79d5ca98.png)

后与aGeo逐个字比对

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766847300197-fd5e0b9f-42ec-41bf-ab8c-2cbc5554b389.png)

这些东西xor 2A，提出来即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766847465627-0b234317-1242-43e2-ba5c-8955e32f6e30.png)

moectf{H@v4_fUn}



