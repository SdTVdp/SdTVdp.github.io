---
title: "2025_TGCTF"
date: 2025-04-12 9:00:00
excerpt: "TGCTF 与 HZNUCTF 部分逆向题记录，包含 base64、Unity、z3 和 XTEA 题目。"
cover: /uploads/backgrounds/TGctfCover.png
top_img: /uploads/backgrounds/TGctfTop.png
tags:
  - reverse
  - competition
---
# 1.base64
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1745990085942-da9a21c5-3198-4586-b2d5-c144d145a3b0.png)

直接写代码按照10e0函数和strcmp函数反解出v5即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1745990371323-103c7b94-51e4-4bad-a9b5-79d40d2de4bb.png)

> <font style="color:rgba(0, 0, 0, 0.6);background-color:rgb(252, 252, 252);">v13 = v12 +24；</font>  
<font style="color:rgba(0, 0, 0, 0.6);background-color:rgb(252, 252, 252);">v14 = v13 -64；</font>
>
> <font style="color:rgba(0, 0, 0, 0.6);background-color:rgb(252, 252, 252);">这两处存在魔改</font>
>

然后直接写代码即可

```plain
code_table = "GLp/+Wn7uqX8FQ2JDR1c0M6U53sjBwyxglmrCVdSThAfEOvPHaYZNzo4ktK9iebI"
decode_map = {c: i for i, c in enumerate(code_table)}

def decode_custom_base64(s):
    s_clean = s.rstrip('=')
    pad_count = s.count('=')
    
    data = []
    for c in s_clean:
        if c not in decode_map:
            raise ValueError(f"Invalid character '{c}' in input")
        index = decode_map[c]
        x = (index - 24) % 64
        data.append(x)
    
    result = bytearray()
    for i in range(0, len(data), 4):
        chunk = data[i:i+4]
        while len(chunk) < 4:
            chunk.append(0)
        a, b, c, d = chunk
        byte1 = (a << 2) | (b >> 4)
        byte2 = ((b & 0x0f) << 4) | (c >> 2)
        byte3 = ((c & 0x03) << 6) | d
        result.extend([byte1, byte2, byte3])
    
    if pad_count == 1:
        result = result[:-1]
    elif pad_count == 2:
        result = result[:-2]
    return bytes(result)

encoded_str = "AwLdOEVEhIWtajB2CbCWCbTRVsFFC8hirfiXC9gWH9HQayCJVbB8CIF="
decoded_bytes = decode_custom_base64(encoded_str)
print(decoded_bytes.decode('utf-8', errors='replace'))

```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1745990664674-9ebb9631-a6a1-44ec-9bcc-b1f1491402b9.png)

解得flag  HZNUCTF{ad162c-2d94-434d-9222-b65dc76a32}

# 2.水果忍者
本题属于unity逆向，涉及到dll的反编译，使用visual studio随附的ILdasm即可，简单的3D游戏的逻辑均在Assembly-CSharp.dll这个文件中

使用TGspy反编译Assembly-CSharp.dll，并在{}类中寻找即可

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1744516571641-495dd2e8-4ea9-4f41-bfa5-2b33c5d80c36.png)

最终可以在GameManager类中找到密钥和密文

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1744516639075-59b611af-4cbb-4fad-8f44-ea1250fe9d91.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1744516732479-cb0ee915-b55c-4333-8db7-fa5b3f64ffb6.png)

以及相关decrypt函数

偏移量，密钥，密文，一眼AES

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1744523235424-1244a1d9-b2e4-4b48-96a2-b62ed72ec343.png)

直接解密即可

# 3.蛇年
拿到手是个exe文件，解包即可得到

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1745992353000-e1c2b8b6-93d6-4713-b00f-278376cbb542.png)

复制进vs

```plain
from collections import Counter
print('Welcome to HZNUCTF!!!')
print('Plz input the flag:')
ooo0oOoooOOO0 = input()
oOO0OoOoo000 = Counter(ooo0oOoooOOO0)
O0o00 = ''.join(str(oOO0OoOoo000[oOooo0OOO]) for oOooo0OOO in ooo0oOoooOOO0)
print('ans1:', O0o00, end='')
if O0o00 != '111111116257645365477364777645752361':
    print('wrong_wrong!!!')
    exit(1)
iiIII = ''
for oOooo0OOO in ooo0oOoooOOO0:
    if oOO0OoOoo000[oOooo0OOO] > 0:
        iiIII += oOooo0OOO + str(oOO0OoOoo000[oOooo0OOO])
        oOO0OoOoo000[oOooo0OOO] = 0
i11i1Iii1I1 = [ord(oOooo0OOO) for oOooo0OOO in iiIII]
ii1iIi1i11i = [
    7 * i11i1Iii1I1[0] == 504,
    9 * i11i1Iii1I1[0] - 5 * i11i1Iii1I1[1] == 403,
    (2 * i11i1Iii1I1[0] - 5 * i11i1Iii1I1[1]) + 10 * i11i1Iii1I1[2] == 799,
    3 * i11i1Iii1I1[0] + 8 * i11i1Iii1I1[1] + 15 * i11i1Iii1I1[2] + 20 * i11i1Iii1I1[3] == 2938,
    (5 * i11i1Iii1I1[0] + 15 * i11i1Iii1I1[1] + 20 * i11i1Iii1I1[2] - 19 * i11i1Iii1I1[3]) + 1 * i11i1Iii1I1[4] == 2042,
    (7 * i11i1Iii1I1[0] + 1 * i11i1Iii1I1[1] + 9 * i11i1Iii1I1[2] - 11 * i11i1Iii1I1[3]) + 2 * i11i1Iii1I1[4] + 5 * i11i1Iii1I1[5] == 1225,
    11 * i11i1Iii1I1[0] + 22 * i11i1Iii1I1[1] + 33 * i11i1Iii1I1[2] + 44 * i11i1Iii1I1[3] + 55 * i11i1Iii1I1[4] + 66 * i11i1Iii1I1[5] - 77 * i11i1Iii1I1[6] == 7975,
    ((21 * i11i1Iii1I1[0] + 23 * i11i1Iii1I1[1] + 3 * i11i1Iii1I1[2] + 24 * i11i1Iii1I1[3] - 55 * i11i1Iii1I1[4]) + 6 * i11i1Iii1I1[5] - 7 * i11i1Iii1I1[6]) + 15 * i11i1Iii1I1[7] == 229,
    (2 * i11i1Iii1I1[0] + 26 * i11i1Iii1I1[1] + 13 * i11i1Iii1I1[2] + 0 * i11i1Iii1I1[3] - 65 * i11i1Iii1I1[4]) + 15 * i11i1Iii1I1[5] + 29 * i11i1Iii1I1[6] + 1 * i11i1Iii1I1[7] + 20 * i11i1Iii1I1[8] == 2107,
    (10 * i11i1Iii1I1[0] + 7 * i11i1Iii1I1[1] + -9 * i11i1Iii1I1[2] + 6 * i11i1Iii1I1[3] + 7 * i11i1Iii1I1[4] + 1 * i11i1Iii1I1[5] + 22 * i11i1Iii1I1[6] + 21 * i11i1Iii1I1[7] - 22 * i11i1Iii1I1[8]) + 30 * i11i1Iii1I1[9] == 4037,
    (15 * i11i1Iii1I1[0] + 59 * i11i1Iii1I1[1] + 56 * i11i1Iii1I1[2] + 66 * i11i1Iii1I1[3] + 7 * i11i1Iii1I1[4] + 1 * i11i1Iii1I1[5] - 122 * i11i1Iii1I1[6]) + 21 * i11i1Iii1I1[7] + 32 * i11i1Iii1I1[8] + 3 * i11i1Iii1I1[9] - 10 * i11i1Iii1I1[10] == 4950,
    (((13 * i11i1Iii1I1[0] + 66 * i11i1Iii1I1[1] + 29 * i11i1Iii1I1[2] + 39 * i11i1Iii1I1[3] - 33 * i11i1Iii1I1[4]) + 13 * i11i1Iii1I1[5] - 2 * i11i1Iii1I1[6]) + 42 * i11i1Iii1I1[7] + 62 * i11i1Iii1I1[8] + 1 * i11i1Iii1I1[9] - 10 * i11i1Iii1I1[10]) + 11 * i11i1Iii1I1[11] == 12544,
    (((23 * i11i1Iii1I1[0] + 6 * i11i1Iii1I1[1] + 29 * i11i1Iii1I1[2] + 3 * i11i1Iii1I1[3] - 3 * i11i1Iii1I1[4]) + 63 * i11i1Iii1I1[5] - 25 * i11i1Iii1I1[6]) + 2 * i11i1Iii1I1[7] + 32 * i11i1Iii1I1[8] + 1 * i11i1Iii1I1[9] - 10 * i11i1Iii1I1[10]) + 11 * i11i1Iii1I1[11] - 12 * i11i1Iii1I1[12] == 6585,
    ((((223 * i11i1Iii1I1[0] + 6 * i11i1Iii1I1[1] - 29 * i11i1Iii1I1[2] - 53 * i11i1Iii1I1[3] - 3 * i11i1Iii1I1[4]) + 3 * i11i1Iii1I1[5] - 65 * i11i1Iii1I1[6]) + 0 * i11i1Iii1I1[7] + 36 * i11i1Iii1I1[8] + 1 * i11i1Iii1I1[9] - 15 * i11i1Iii1I1[10]) + 16 * i11i1Iii1I1[11] - 18 * i11i1Iii1I1[12]) + 13 * i11i1Iii1I1[13] == 6893,
    ((((29 * i11i1Iii1I1[0] + 13 * i11i1Iii1I1[1] - 9 * i11i1Iii1I1[2] - 93 * i11i1Iii1I1[3]) + 33 * i11i1Iii1I1[4] + 6 * i11i1Iii1I1[5] + 65 * i11i1Iii1I1[6] + 1 * i11i1Iii1I1[7] - 36 * i11i1Iii1I1[8]) + 0 * i11i1Iii1I1[9] - 16 * i11i1Iii1I1[10]) + 96 * i11i1Iii1I1[11] - 68 * i11i1Iii1I1[12]) + 33 * i11i1Iii1I1[13] - 14 * i11i1Iii1I1[14] == 1883,
    (((69 * i11i1Iii1I1[0] + 77 * i11i1Iii1I1[1] - 93 * i11i1Iii1I1[2] - 12 * i11i1Iii1I1[3]) + 0 * i11i1Iii1I1[4] + 0 * i11i1Iii1I1[5] + 1 * i11i1Iii1I1[6] + 16 * i11i1Iii1I1[7] + 36 * i11i1Iii1I1[8] + 6 * i11i1Iii1I1[9] + 19 * i11i1Iii1I1[10] + 66 * i11i1Iii1I1[11] - 8 * i11i1Iii1I1[12]) + 38 * i11i1Iii1I1[13] - 16 * i11i1Iii1I1[14]) + 15 * i11i1Iii1I1[15] == 8257,
    ((((23 * i11i1Iii1I1[0] + 2 * i11i1Iii1I1[1] - 3 * i11i1Iii1I1[2] - 11 * i11i1Iii1I1[3]) + 12 * i11i1Iii1I1[4] + 24 * i11i1Iii1I1[5] + 1 * i11i1Iii1I1[6] + 6 * i11i1Iii1I1[7] + 14 * i11i1Iii1I1[8] - 0 * i11i1Iii1I1[9]) + 1 * i11i1Iii1I1[10] + 68 * i11i1Iii1I1[11] - 18 * i11i1Iii1I1[12]) + 68 * i11i1Iii1I1[13] - 26 * i11i1Iii1I1[14]) + 15 * i11i1Iii1I1[15] - 16 * i11i1Iii1I1[16] == 5847,
    (((((24 * i11i1Iii1I1[0] + 0 * i11i1Iii1I1[1] - 1 * i11i1Iii1I1[2] - 15 * i11i1Iii1I1[3]) + 13 * i11i1Iii1I1[4] + 4 * i11i1Iii1I1[5] + 16 * i11i1Iii1I1[6] + 67 * i11i1Iii1I1[7] + 146 * i11i1Iii1I1[8] - 50 * i11i1Iii1I1[9]) + 16 * i11i1Iii1I1[10] + 6 * i11i1Iii1I1[11] - 1 * i11i1Iii1I1[12]) + 69 * i11i1Iii1I1[13] - 27 * i11i1Iii1I1[14]) + 45 * i11i1Iii1I1[15] - 6 * i11i1Iii1I1[16]) + 17 * i11i1Iii1I1[17] == 18257,
    ((((25 * i11i1Iii1I1[0] + 26 * i11i1Iii1I1[1] - 89 * i11i1Iii1I1[2]) + 16 * i11i1Iii1I1[3] + 19 * i11i1Iii1I1[4] + 44 * i11i1Iii1I1[5] + 36 * i11i1Iii1I1[6] + 66 * i11i1Iii1I1[7] - 150 * i11i1Iii1I1[8] - 250 * i11i1Iii1I1[9]) + 166 * i11i1Iii1I1[10] + 126 * i11i1Iii1I1[11] - 11 * i11i1Iii1I1[12]) + 690 * i11i1Iii1I1[13] - 207 * i11i1Iii1I1[14]) + 46 * i11i1Iii1I1[15] + 6 * i11i1Iii1I1[16] + 7 * i11i1Iii1I1[17] - 18 * i11i1Iii1I1[18] == 12591,
    (((((5 * i11i1Iii1I1[0] + 26 * i11i1Iii1I1[1] + 8 * i11i1Iii1I1[2] + 160 * i11i1Iii1I1[3] + 9 * i11i1Iii1I1[4] - 4 * i11i1Iii1I1[5]) + 36 * i11i1Iii1I1[6] + 6 * i11i1Iii1I1[7] - 15 * i11i1Iii1I1[8] - 20 * i11i1Iii1I1[9]) + 66 * i11i1Iii1I1[10] + 16 * i11i1Iii1I1[11] - 1 * i11i1Iii1I1[12]) + 690 * i11i1Iii1I1[13] - 20 * i11i1Iii1I1[14]) + 46 * i11i1Iii1I1[15] + 6 * i11i1Iii1I1[16] + 7 * i11i1Iii1I1[17] - 18 * i11i1Iii1I1[18]) + 19 * i11i1Iii1I1[19] == 52041,
    ((((((29 * i11i1Iii1I1[0] - 26 * i11i1Iii1I1[1]) + 0 * i11i1Iii1I1[2] + 60 * i11i1Iii1I1[3] + 90 * i11i1Iii1I1[4] - 4 * i11i1Iii1I1[5]) + 6 * i11i1Iii1I1[6] + 6 * i11i1Iii1I1[7] - 16 * i11i1Iii1I1[8] - 21 * i11i1Iii1I1[9]) + 69 * i11i1Iii1I1[10] + 6 * i11i1Iii1I1[11] - 12 * i11i1Iii1I1[12]) + 69 * i11i1Iii1I1[13] - 20 * i11i1Iii1I1[14] - 46 * i11i1Iii1I1[15]) + 65 * i11i1Iii1I1[16] + 0 * i11i1Iii1I1[17] - 1 * i11i1Iii1I1[18]) + 39 * i11i1Iii1I1[19] - 20 * i11i1Iii1I1[20] == 20253,
    (((((((45 * i11i1Iii1I1[0] - 56 * i11i1Iii1I1[1]) + 10 * i11i1Iii1I1[2] + 650 * i11i1Iii1I1[3] - 900 * i11i1Iii1I1[4]) + 44 * i11i1Iii1I1[5] + 66 * i11i1Iii1I1[6] - 6 * i11i1Iii1I1[7] - 6 * i11i1Iii1I1[8] - 21 * i11i1Iii1I1[9]) + 9 * i11i1Iii1I1[10] - 6 * i11i1Iii1I1[11] - 12 * i11i1Iii1I1[12]) + 69 * i11i1Iii1I1[13] - 2 * i11i1Iii1I1[14] - 406 * i11i1Iii1I1[15]) + 651 * i11i1Iii1I1[16] + 2 * i11i1Iii1I1[17] - 10 * i11i1Iii1I1[18]) + 69 * i11i1Iii1I1[19] - 0 * i11i1Iii1I1[20]) + 21 * i11i1Iii1I1[21] == 18768,
    (((((555 * i11i1Iii1I1[0] - 6666 * i11i1Iii1I1[1]) + 70 * i11i1Iii1I1[2] + 510 * i11i1Iii1I1[3] - 90 * i11i1Iii1I1[4]) + 499 * i11i1Iii1I1[5] + 66 * i11i1Iii1I1[6] - 66 * i11i1Iii1I1[7] - 610 * i11i1Iii1I1[8] - 221 * i11i1Iii1I1[9]) + 9 * i11i1Iii1I1[10] - 23 * i11i1Iii1I1[11] - 102 * i11i1Iii1I1[12]) + 6 * i11i1Iii1I1[13] + 2050 * i11i1Iii1I1[14] - 406 * i11i1Iii1I1[15]) + 665 * i11i1Iii1I1[16] + 333 * i11i1Iii1I1[17] + 100 * i11i1Iii1I1[18] + 609 * i11i1Iii1I1[19] + 777 * i11i1Iii1I1[20] + 201 * i11i1Iii1I1[21] - 22 * i11i1Iii1I1[22] == 111844,
    (((((((1 * i11i1Iii1I1[0] - 22 * i11i1Iii1I1[1]) + 333 * i11i1Iii1I1[2] + 4444 * i11i1Iii1I1[3] - 5555 * i11i1Iii1I1[4]) + 6666 * i11i1Iii1I1[5] - 666 * i11i1Iii1I1[6]) + 676 * i11i1Iii1I1[7] - 660 * i11i1Iii1I1[8] - 22 * i11i1Iii1I1[9]) + 9 * i11i1Iii1I1[10] - 73 * i11i1Iii1I1[11] - 107 * i11i1Iii1I1[12]) + 6 * i11i1Iii1I1[13] + 250 * i11i1Iii1I1[14] - 6 * i11i1Iii1I1[15]) + 65 * i11i1Iii1I1[16] + 39 * i11i1Iii1I1[17] + 10 * i11i1Iii1I1[18] + 69 * i11i1Iii1I1[19] + 777 * i11i1Iii1I1[20] + 201 * i11i1Iii1I1[21] - 2 * i11i1Iii1I1[22]) + 23 * i11i1Iii1I1[23] == 159029,
    (((520 * i11i1Iii1I1[0] - 222 * i11i1Iii1I1[1]) + 333 * i11i1Iii1I1[2] + 4 * i11i1Iii1I1[3] - 56655 * i11i1Iii1I1[4]) + 6666 * i11i1Iii1I1[5] + 666 * i11i1Iii1I1[6] + 66 * i11i1Iii1I1[7] - 60 * i11i1Iii1I1[8] - 220 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 73 * i11i1Iii1I1[11] + 1007 * i11i1Iii1I1[12] + 7777 * i11i1Iii1I1[13] + 2500 * i11i1Iii1I1[14] + 6666 * i11i1Iii1I1[15] + 605 * i11i1Iii1I1[16] + 390 * i11i1Iii1I1[17] + 100 * i11i1Iii1I1[18] + 609 * i11i1Iii1I1[19] + 99999 * i11i1Iii1I1[20] + 210 * i11i1Iii1I1[21] + 232 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 24 * i11i1Iii1I1[24] == 2762025,
    ((((1323 * i11i1Iii1I1[0] - 22 * i11i1Iii1I1[1]) + 333 * i11i1Iii1I1[2] + 4 * i11i1Iii1I1[3] - 55 * i11i1Iii1I1[4]) + 666 * i11i1Iii1I1[5] + 666 * i11i1Iii1I1[6] + 66 * i11i1Iii1I1[7] - 660 * i11i1Iii1I1[8] - 220 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 3 * i11i1Iii1I1[11] + 100 * i11i1Iii1I1[12] + 777 * i11i1Iii1I1[13] + 2500 * i11i1Iii1I1[14] + 6666 * i11i1Iii1I1[15] + 605 * i11i1Iii1I1[16] + 390 * i11i1Iii1I1[17] + 100 * i11i1Iii1I1[18] + 609 * i11i1Iii1I1[19] + 9999 * i11i1Iii1I1[20] + 210 * i11i1Iii1I1[21] + 232 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 24 * i11i1Iii1I1[24]) + 25 * i11i1Iii1I1[25] == 1551621,
    (((((777 * i11i1Iii1I1[0] - 22 * i11i1Iii1I1[1]) + 6969 * i11i1Iii1I1[2] + 4 * i11i1Iii1I1[3] - 55 * i11i1Iii1I1[4]) + 666 * i11i1Iii1I1[5] - 6 * i11i1Iii1I1[6]) + 96 * i11i1Iii1I1[7] - 60 * i11i1Iii1I1[8] - 220 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 3 * i11i1Iii1I1[11] + 100 * i11i1Iii1I1[12] + 777 * i11i1Iii1I1[13] + 250 * i11i1Iii1I1[14] + 666 * i11i1Iii1I1[15] + 65 * i11i1Iii1I1[16] + 90 * i11i1Iii1I1[17] + 100 * i11i1Iii1I1[18] + 609 * i11i1Iii1I1[19] + 999 * i11i1Iii1I1[20] + 21 * i11i1Iii1I1[21] + 232 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 24 * i11i1Iii1I1[24]) + 25 * i11i1Iii1I1[25] - 26 * i11i1Iii1I1[26] == 948348,
    ((((((97 * i11i1Iii1I1[0] - 22 * i11i1Iii1I1[1]) + 6969 * i11i1Iii1I1[2] + 4 * i11i1Iii1I1[3] - 56 * i11i1Iii1I1[4]) + 96 * i11i1Iii1I1[5] - 6 * i11i1Iii1I1[6]) + 96 * i11i1Iii1I1[7] - 60 * i11i1Iii1I1[8] - 20 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 3 * i11i1Iii1I1[11] + 10 * i11i1Iii1I1[12] + 707 * i11i1Iii1I1[13] + 250 * i11i1Iii1I1[14] + 666 * i11i1Iii1I1[15] + -9 * i11i1Iii1I1[16] + 90 * i11i1Iii1I1[17] + -2 * i11i1Iii1I1[18] + 609 * i11i1Iii1I1[19] + 0 * i11i1Iii1I1[20] + 21 * i11i1Iii1I1[21] + 2 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 24 * i11i1Iii1I1[24]) + 25 * i11i1Iii1I1[25] - 26 * i11i1Iii1I1[26]) + 27 * i11i1Iii1I1[27] == 777044,
    (((((177 * i11i1Iii1I1[0] - 22 * i11i1Iii1I1[1]) + 699 * i11i1Iii1I1[2] + 64 * i11i1Iii1I1[3] - 56 * i11i1Iii1I1[4] - 96 * i11i1Iii1I1[5] - 66 * i11i1Iii1I1[6]) + 96 * i11i1Iii1I1[7] - 60 * i11i1Iii1I1[8] - 20 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 3 * i11i1Iii1I1[11] + 10 * i11i1Iii1I1[12] + 707 * i11i1Iii1I1[13] + 250 * i11i1Iii1I1[14] + 666 * i11i1Iii1I1[15] + -9 * i11i1Iii1I1[16] + 0 * i11i1Iii1I1[17] + -2 * i11i1Iii1I1[18] + 69 * i11i1Iii1I1[19] + 0 * i11i1Iii1I1[20] + 21 * i11i1Iii1I1[21] + 222 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 224 * i11i1Iii1I1[24]) + 25 * i11i1Iii1I1[25] - 26 * i11i1Iii1I1[26]) + 27 * i11i1Iii1I1[27] - 28 * i11i1Iii1I1[28] == 185016,
    ((((((77 * i11i1Iii1I1[0] - 2 * i11i1Iii1I1[1]) + 6 * i11i1Iii1I1[2] + 6 * i11i1Iii1I1[3] - 96 * i11i1Iii1I1[4] - 9 * i11i1Iii1I1[5] - 6 * i11i1Iii1I1[6]) + 96 * i11i1Iii1I1[7] - 0 * i11i1Iii1I1[8] - 20 * i11i1Iii1I1[9]) + 99 * i11i1Iii1I1[10] + 3 * i11i1Iii1I1[11] + 10 * i11i1Iii1I1[12] + 707 * i11i1Iii1I1[13] + 250 * i11i1Iii1I1[14] + 666 * i11i1Iii1I1[15] + -9 * i11i1Iii1I1[16] + 0 * i11i1Iii1I1[17] + -2 * i11i1Iii1I1[18] + 9 * i11i1Iii1I1[19] + 0 * i11i1Iii1I1[20] + 21 * i11i1Iii1I1[21] + 222 * i11i1Iii1I1[22] + 23 * i11i1Iii1I1[23] - 224 * i11i1Iii1I1[24]) + 26 * i11i1Iii1I1[25] - -58 * i11i1Iii1I1[26]) + 27 * i11i1Iii1I1[27] - 2 * i11i1Iii1I1[28]) + 29 * i11i1Iii1I1[29] == 130106]
if all(ii1iIi1i11i):
    print('Congratulation!!!')
else:
    print('wrong_wrong!!!')
```

比较显然的是一道z3题目，直接写代码即可

```plain
from z3 import *
s = Solver()
Enc = [Int(f'x{i}') for i in range(30)]
s.add(7 * Enc[0] == 504)
s.add(9 * Enc[0] - 5 * Enc[1] == 403)
s.add((2 * Enc[0] - 5 * Enc[1]) + 10 * Enc[2] == 799)
s.add(3 * Enc[0] + 8 * Enc[1] + 15 * Enc[2] + 20 * Enc[3] == 2938)
s.add((5 * Enc[0] + 15 * Enc[1] + 20 * Enc[2] - 19 * Enc[3]) + 1 * Enc[4] == 2042)
s.add((7 * Enc[0] + 1 * Enc[1] + 9 * Enc[2] - 11 * Enc[3]) + 2 * Enc[4] + 5 * Enc[5] == 1225)
s.add(11 * Enc[0] + 22 * Enc[1] + 33 * Enc[2] + 44 * Enc[3] + 55 * Enc[4] + 66 * Enc[5] - 77 * Enc[6] == 7975)
s.add(((21 * Enc[0] + 23 * Enc[1] + 3 * Enc[2] + 24 * Enc[3] - 55 * Enc[4]) + 6 * Enc[5] - 7 * Enc[6]) + 15 * Enc[7] == 229)
s.add((2 * Enc[0] + 26 * Enc[1] + 13 * Enc[2] + 0 * Enc[3] - 65 * Enc[4]) + 15 * Enc[5] + 29 * Enc[6] + 1 * Enc[7] + 20 * Enc[8] == 2107)
s.add((10 * Enc[0] + 7 * Enc[1] + -9 * Enc[2] + 6 * Enc[3] + 7 * Enc[4] + 1 * Enc[5] + 22 * Enc[6] + 21 * Enc[7] - 22 * Enc[8]) + 30 * Enc[9] == 4037)
s.add((15 * Enc[0] + 59 * Enc[1] + 56 * Enc[2] + 66 * Enc[3] + 7 * Enc[4] + 1 * Enc[5] - 122 * Enc[6]) + 21 * Enc[7] + 32 * Enc[8] + 3 * Enc[9] - 10 * Enc[10] == 4950)
s.add((((13 * Enc[0] + 66 * Enc[1] + 29 * Enc[2] + 39 * Enc[3] - 33 * Enc[4]) + 13 * Enc[5] - 2 * Enc[6]) + 42 * Enc[7] + 62 * Enc[8] + 1 * Enc[9] - 10 * Enc[10]) + 11 * Enc[11] == 12544)
s.add((((23 * Enc[0] + 6 * Enc[1] + 29 * Enc[2] + 3 * Enc[3] - 3 * Enc[4]) + 63 * Enc[5] - 25 * Enc[6]) + 2 * Enc[7] + 32 * Enc[8] + 1 * Enc[9] - 10 * Enc[10]) + 11 * Enc[11] - 12 * Enc[12] == 6585)
s.add(((((223 * Enc[0] + 6 * Enc[1] - 29 * Enc[2] - 53 * Enc[3] - 3 * Enc[4]) + 3 * Enc[5] - 65 * Enc[6]) + 0 * Enc[7] + 36 * Enc[8] + 1 * Enc[9] - 15 * Enc[10]) + 16 * Enc[11] - 18 * Enc[12]) + 13 * Enc[13] == 6893)
s.add(((((29 * Enc[0] + 13 * Enc[1] - 9 * Enc[2] - 93 * Enc[3]) + 33 * Enc[4] + 6 * Enc[5] + 65 * Enc[6] + 1 * Enc[7] - 36 * Enc[8]) + 0 * Enc[9] - 16 * Enc[10]) + 96 * Enc[11] - 68 * Enc[12]) + 33 * Enc[13] - 14 * Enc[14] == 1883)
s.add((((69 * Enc[0] + 77 * Enc[1] - 93 * Enc[2] - 12 * Enc[3]) + 0 * Enc[4] + 0 * Enc[5] + 1 * Enc[6] + 16 * Enc[7] + 36 * Enc[8] + 6 * Enc[9] + 19 * Enc[10] + 66 * Enc[11] - 8 * Enc[12]) + 38 * Enc[13] - 16 * Enc[14]) + 15 * Enc[15] == 8257)
s.add(((((23 * Enc[0] + 2 * Enc[1] - 3 * Enc[2] - 11 * Enc[3]) + 12 * Enc[4] + 24 * Enc[5] + 1 * Enc[6] + 6 * Enc[7] + 14 * Enc[8] - 0 * Enc[9]) + 1 * Enc[10] + 68 * Enc[11] - 18 * Enc[12]) + 68 * Enc[13] - 26 * Enc[14]) + 15 * Enc[15] - 16 * Enc[16] == 5847)
s.add((((((24 * Enc[0] + 0 * Enc[1] - 1 * Enc[2] - 15 * Enc[3]) + 13 * Enc[4] + 4 * Enc[5] + 16 * Enc[6] + 67 * Enc[7] + 146 * Enc[8] - 50 * Enc[9]) + 16 * Enc[10] + 6 * Enc[11] - 1 * Enc[12]) + 69 * Enc[13] - 27 * Enc[14]) + 45 * Enc[15] - 6 * Enc[16]) + 17 * Enc[17] == 18257)
s.add(((((25 * Enc[0] + 26 * Enc[1] - 89 * Enc[2]) + 16 * Enc[3] + 19 * Enc[4] + 44 * Enc[5] + 36 * Enc[6] + 66 * Enc[7] - 150 * Enc[8] - 250 * Enc[9]) + 166 * Enc[10] + 126 * Enc[11] - 11 * Enc[12]) + 690 * Enc[13] - 207 * Enc[14]) + 46 * Enc[15] + 6 * Enc[16] + 7 * Enc[17] - 18 * Enc[18] == 12591)
s.add((((((5 * Enc[0] + 26 * Enc[1] + 8 * Enc[2] + 160 * Enc[3] + 9 * Enc[4] - 4 * Enc[5]) + 36 * Enc[6] + 6 * Enc[7] - 15 * Enc[8] - 20 * Enc[9]) + 66 * Enc[10] + 16 * Enc[11] - 1 * Enc[12]) + 690 * Enc[13] - 20 * Enc[14]) + 46 * Enc[15] + 6 * Enc[16] + 7 * Enc[17] - 18 * Enc[18]) + 19 * Enc[19] == 52041)
s.add(((((((29 * Enc[0] - 26 * Enc[1]) + 0 * Enc[2] + 60 * Enc[3] + 90 * Enc[4] - 4 * Enc[5]) + 6 * Enc[6] + 6 * Enc[7] - 16 * Enc[8] - 21 * Enc[9]) + 69 * Enc[10] + 6 * Enc[11] - 12 * Enc[12]) + 69 * Enc[13] - 20 * Enc[14] - 46 * Enc[15]) + 65 * Enc[16] + 0 * Enc[17] - 1 * Enc[18]) + 39 * Enc[19] - 20 * Enc[20] == 20253)
s.add((((((((45 * Enc[0] - 56 * Enc[1]) + 10 * Enc[2] + 650 * Enc[3] - 900 * Enc[4]) + 44 * Enc[5] + 66 * Enc[6] - 6 * Enc[7] - 6 * Enc[8] - 21 * Enc[9]) + 9 * Enc[10] - 6 * Enc[11] - 12 * Enc[12]) + 69 * Enc[13] - 2 * Enc[14] - 406 * Enc[15]) + 651 * Enc[16] + 2 * Enc[17] - 10 * Enc[18]) + 69 * Enc[19] - 0 * Enc[20]) + 21 * Enc[21] == 18768)
s.add((((((555 * Enc[0] - 6666 * Enc[1]) + 70 * Enc[2] + 510 * Enc[3] - 90 * Enc[4]) + 499 * Enc[5] + 66 * Enc[6] - 66 * Enc[7] - 610 * Enc[8] - 221 * Enc[9]) + 9 * Enc[10] - 23 * Enc[11] - 102 * Enc[12]) + 6 * Enc[13] + 2050 * Enc[14] - 406 * Enc[15]) + 665 * Enc[16] + 333 * Enc[17] + 100 * Enc[18] + 609 * Enc[19] + 777 * Enc[20] + 201 * Enc[21] - 22 * Enc[22] == 111844)
s.add((((((((1 * Enc[0] - 22 * Enc[1]) + 333 * Enc[2] + 4444 * Enc[3] - 5555 * Enc[4]) + 6666 * Enc[5] - 666 * Enc[6]) + 676 * Enc[7] - 660 * Enc[8] - 22 * Enc[9]) + 9 * Enc[10] - 73 * Enc[11] - 107 * Enc[12]) + 6 * Enc[13] + 250 * Enc[14] - 6 * Enc[15]) + 65 * Enc[16] + 39 * Enc[17] + 10 * Enc[18] + 69 * Enc[19] + 777 * Enc[20] + 201 * Enc[21] - 2 * Enc[22]) + 23 * Enc[23] == 159029)
s.add((((520 * Enc[0] - 222 * Enc[1]) + 333 * Enc[2] + 4 * Enc[3] - 56655 * Enc[4]) + 6666 * Enc[5] + 666 * Enc[6] + 66 * Enc[7] - 60 * Enc[8] - 220 * Enc[9]) + 99 * Enc[10] + 73 * Enc[11] + 1007 * Enc[12] + 7777 * Enc[13] + 2500 * Enc[14] + 6666 * Enc[15] + 605 * Enc[16] + 390 * Enc[17] + 100 * Enc[18] + 609 * Enc[19] + 99999 * Enc[20] + 210 * Enc[21] + 232 * Enc[22] + 23 * Enc[23] - 24 * Enc[24] == 2762025)
s.add(((((1323 * Enc[0] - 22 * Enc[1]) + 333 * Enc[2] + 4 * Enc[3] - 55 * Enc[4]) + 666 * Enc[5] + 666 * Enc[6] + 66 * Enc[7] - 660 * Enc[8] - 220 * Enc[9]) + 99 * Enc[10] + 3 * Enc[11] + 100 * Enc[12] + 777 * Enc[13] + 2500 * Enc[14] + 6666 * Enc[15] + 605 * Enc[16] + 390 * Enc[17] + 100 * Enc[18] + 609 * Enc[19] + 9999 * Enc[20] + 210 * Enc[21] + 232 * Enc[22] + 23 * Enc[23] - 24 * Enc[24]) + 25 * Enc[25] == 1551621)
s.add((((((777 * Enc[0] - 22 * Enc[1]) + 6969 * Enc[2] + 4 * Enc[3] - 55 * Enc[4]) + 666 * Enc[5] - 6 * Enc[6]) + 96 * Enc[7] - 60 * Enc[8] - 220 * Enc[9]) + 99 * Enc[10] + 3 * Enc[11] + 100 * Enc[12] + 777 * Enc[13] + 250 * Enc[14] + 666 * Enc[15] + 65 * Enc[16] + 90 * Enc[17] + 100 * Enc[18] + 609 * Enc[19] + 999 * Enc[20] + 21 * Enc[21] + 232 * Enc[22] + 23 * Enc[23] - 24 * Enc[24]) + 25 * Enc[25] - 26 * Enc[26] == 948348)
s.add(((((((97 * Enc[0] - 22 * Enc[1]) + 6969 * Enc[2] + 4 * Enc[3] - 56 * Enc[4]) + 96 * Enc[5] - 6 * Enc[6]) + 96 * Enc[7] - 60 * Enc[8] - 20 * Enc[9]) + 99 * Enc[10] + 3 * Enc[11] + 10 * Enc[12] + 707 * Enc[13] + 250 * Enc[14] + 666 * Enc[15] + -9 * Enc[16] + 90 * Enc[17] + -2 * Enc[18] + 609 * Enc[19] + 0 * Enc[20] + 21 * Enc[21] + 2 * Enc[22] + 23 * Enc[23] - 24 * Enc[24]) + 25 * Enc[25] - 26 * Enc[26]) + 27 * Enc[27] == 777044)
s.add((((((177 * Enc[0] - 22 * Enc[1]) + 699 * Enc[2] + 64 * Enc[3] - 56 * Enc[4] - 96 * Enc[5] - 66 * Enc[6]) + 96 * Enc[7] - 60 * Enc[8] - 20 * Enc[9]) + 99 * Enc[10] + 3 * Enc[11] + 10 * Enc[12] + 707 * Enc[13] + 250 * Enc[14] + 666 * Enc[15] + -9 * Enc[16] + 0 * Enc[17] + -2 * Enc[18] + 69 * Enc[19] + 0 * Enc[20] + 21 * Enc[21] + 222 * Enc[22] + 23 * Enc[23] - 224 * Enc[24]) + 25 * Enc[25] - 26 * Enc[26]) + 27 * Enc[27] - 28 * Enc[28] == 185016)
s.add(((((((77 * Enc[0] - 2 * Enc[1]) + 6 * Enc[2] + 6 * Enc[3] - 96 * Enc[4] - 9 * Enc[5] - 6 * Enc[6]) + 96 * Enc[7] - 0 * Enc[8] - 20 * Enc[9]) + 99 * Enc[10] + 3 * Enc[11] + 10 * Enc[12] + 707 * Enc[13] + 250 * Enc[14] + 666 * Enc[15] + -9 * Enc[16] + 0 * Enc[17] + -2 * Enc[18] + 9 * Enc[19] + 0 * Enc[20] + 21 * Enc[21] + 222 * Enc[22] + 23 * Enc[23] - 224 * Enc[24]) + 26 * Enc[25] - -58 * Enc[26]) + 27 * Enc[27] - 2 * Enc[28]) + 29 * Enc[29] == 130106)
for x in Enc:
    s.add(x >= 32)
    s.add(x <= 126)
if  s.check() == sat:
    m = s.model()
    solution = [m[x].as_long() if m[x] is not None else 0 for x in Enc]
    flag = ''.join([chr(c) for c in solution])
    print("Flag:", flag)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746008639680-4aff7569-8e82-4fc0-bc6f-7f5e43a1340f.png)

经观察可以看出后面的数字是前面字母出现的次数

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746021249177-8b5f066e-66ab-49d9-b06d-1669194437a5.png)

同时注意到这里有一串相似的数字，因此将上下一一对应即可

再经过修改即可得出flag

<font style="color:rgb(76, 73, 72);">HZNUCTF{ad7fa-76a7-ff6a-fffa-7f7d6a}</font>

# <font style="color:rgb(76, 73, 72);">4.XTEA</font>
初始编译器并未给出主函数位置，只能shift f12看看出题人有没有提示

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746021544551-ca478d5e-7ad9-406f-809a-12dc25bad87d.png)

看起来是有的，直接追过去看看

就可以看到加密函数了

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746021696113-aee3c0be-a927-4f8a-a54b-ca3d9d20f5f1.png)

从上往下看函数吧，先是蓝色箭头

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746021673607-96d7548c-ccfc-446a-9c3c-0fc77a4a1dc9.png)

里面是反调试

根据题目提示可知（misc味），且有反调试，且delta是依靠我们输入进来的

猜测delta就是txt里给的标准delta

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1746022348652-8b013700-dde6-47d3-a6d6-0bff72a40c80.png)






