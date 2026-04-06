# 1.warm up
使用VbsEdit运行一遍即可得到明文代码

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743781535608-45057cb3-22cf-43d1-b606-d5800f67d9dc.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743781547876-d80d70b7-ec2a-4a9c-850a-d74a17689ca6.png)

可见源代码是<font style="color:rgb(26, 32, 41);">一个使用RC4加密算法的VB脚本，初始化了两个数组，qwfe作为rc4的key，同时wef作为密文进行了rc4加密，因此直接写rc4解密代码一把梭即可，代码如下</font>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743782538980-7af74128-f784-443b-9e1d-40d1a0aa7ad6.png)

运行即可得到结果，初始flag为

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743782670090-761d7e44-82f9-47af-9f47-af7cbcd9c741.png)

> flag{We1c0me_t0_XYCTF_2025_reverse_ch@lleng3_by_th3_w@y_p3cd0wn's_chall_is_r3@lly_gr3@t_&_fuN!}
>

再依题意把括号内的字符串进行一次md5加密后再上交，可得md5加密后内容为

> 5f9f46c147645dd1e2c8044325d4f93c
>

因此flag为XYCTF{5f9f46c147645dd1e2c8044325d4f93c}

# 2.bf
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743788581778-452a7768-6615-4f13-b00b-bb31f48c33aa.png)

题目拿到长这个样，结合文件名和提示可以很轻松的猜到本题的考点在于brainfuck语言

从语言的定义中我们可以得知类似于“<[-]>”这类的结构都是在初始化寄存器，又因为阅读题目可以得知这里并没有输出函数；同时，观察代码可以看出由于[]中内容的原因导致每个"[]"结构结束时都仅有第一位寄存器存在数值，同时指针位于第二位寄存器，同时函数并没有任何与输出相关的字符。

因此猜测每一个“[-]>”前都是代表一段输出字符的函数，并为其加上输出的.和更改指针位置回到第一位的<,更改代码如图所示

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743789155694-5dc9f18b-40ea-4555-9b4f-5c7703113595.png)

寻找支持brainfuck语言的编译器运行即可，例如在线工具[https://www.w3cschool.cn/tryrun/runcode?lang=brainfuck](https://www.w3cschool.cn/tryrun/runcode?lang=brainfuck)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743789192499-79c8d9c6-8ebe-403f-b1eb-91eb6a26d721.png)

得到flag{W3lC0me_t0_XYCTF_2025_Enj07_1t!}

# 3.ezVM
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743784001359-e882873d-9b7d-4c74-8887-bcfbc12d84ae.png)

exeinfo打开，无壳elf文件，直接转IDA

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743783970081-abddbeb7-cdb9-403c-80da-4ac45518658e.png)

观察到在这里出现了提示性字样，因此猜测403A6起到一个类似主函数的作用

# 4.dragon
拿到手发现是.bc文件，需要进一步编译之后再反编译

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743845028130-ce3c619e-eaab-49d7-a4a4-7afc7f88b021.png)

使用powershell和clang即可将dragon编译为bc，再使用exeinfo

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743845096445-0ae7b337-8880-4d89-a288-7dce28710298.png)

x64无壳，直接转IDA

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743845917500-25de1218-5919-44e0-8169-ea3611890659.png)

通过观察函数可以看出，sub_14001B170和sub_14001B810这两个函数看似有很多switch，实则switch的内容都是固定的，在input u flag处断点即可得到v7、stru的具体内容（这俩在1B170函数执行后内容一致）

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743847574880-ce6a7133-2f81-413f-b2f9-8485dfaf2569.png)

同时可以得知第二个函数仅用于初始化str，将str设置为全0以便于接收输入的flag

因此真正的加密在于1000函数

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743857934538-8a920e91-3735-4061-8fc0-e3c6f8b015ed.png)  
跟进函数内部可以看到0x42的一串，综合之前的128位数和这里的v5*2的64次，从此可以看出这里实现了一个crc64验证算法，意在<font style="color:rgb(36, 41, 46);">验证输入的字符串和程序里已有的数组是否匹配，其中每两个字符对应一个8字节CRC，代码如下</font>

> #include <stdio.h>
>
> #include <stdint.h>
>
> #include <stdlib.h>
>
> #include <string.h>
>
> #define CRC64_POLY 0x42F0E1EBA9EA3693ULL
>
> #define INITIAL_CRC 0xFFFFFFFFFFFFFFFFULL
>
> typedef struct {
>
>     uint64_t crc;
>
>     uint8_t bytes[2];
>
> } CrcPair;
>
> uint64_t compute_crc(const uint8_t* data, size_t len) {
>
>     uint64_t crc = INITIAL_CRC;
>
>     for (size_t i = 0; i < len; i++) {
>
>         uint64_t high = (crc >> 32) ^ ((uint64_t)data[i] << 24);
>
>         crc = (crc & 0xFFFFFFFFULL) | (high << 32);
>
>         for (int j = 0; j < 8; j++) {
>
>             if (crc & (1ULL << 63)) {
>
>                 crc = ((crc << 1) ^ CRC64_POLY) & 0xFFFFFFFFFFFFFFFFULL;
>
>             }
>
>             else {
>
>                 crc = (crc << 1) & 0xFFFFFFFFFFFFFFFFULL;
>
>             }
>
>         }
>
>     }
>
>     return crc;
>
> }
>
> int main() {
>
>     CrcPair* crc_map = (CrcPair*)malloc(256 * 256 * sizeof(CrcPair));
>
>     size_t map_size = 0;
>
> 
>
>     for (int i = 0; i < 256; i++) {
>
>         for (int j = 0; j < 256; j++) {
>
>             uint8_t pair[] = { (uint8_t)i, (uint8_t)j };
>
>             uint64_t crc = compute_crc(pair, 2);
>
>             crc_map[map_size].crc = ~crc;
>
>             memcpy(crc_map[map_size].bytes, pair, 2);
>
>             map_size++;
>
>         }
>
>     }
>
>   uint64_t targets[] = {
>
>         0xDC63E34E419F7B47, 0x031EF8D4E7B2BFC6,
>
>         0x12D62FBC625FD89E, 0x83E8B6E1CC5755E8,
>
>         0xFC7BB1EB2AB665CC, 0x9382CA1B2A62D96B,
>
>         0xB1FFF8A07673C387, 0x0DA81627388E05E1,
>
>         0x9EF1E61AE8D0AAB7, 0x92783FD2E7F26145,
>
>         0x63C97CA1F56FE60B, 0x9BD3A8B043B73AAB
>
>     };
>
>     uint8_t flag[24] = { 0 }; 
>
>     size_t flag_pos = 0;
>
>     for (size_t t = 0; t < sizeof(targets) / sizeof(targets[0]); t++) {
>
>         int found = 0;
>
>         for (size_t i = 0; i < map_size; i++) {
>
>             if (crc_map[i].crc == targets[t]) {
>
>                 memcpy(flag + flag_pos, crc_map[i].bytes, 2);
>
>                 flag_pos += 2;
>
>                 found = 1;
>
>                 break;
>
>             }
>
>         }
>
>     }
>
>     printf("Flag: ");
>
>     for (size_t i = 0; i < sizeof(flag); i++) {
>
>         printf("%c", flag[i]);
>
>     }
>
>     printf("\n");
>
>     free(crc_map);
>
>     return 0;
>
> }
>

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743860529424-c8168be3-6c21-483a-9af2-dcd5004f1e6e.png)

解得flag为Flag: flag{LLVM_1s_Fun_Ri9h7?}

# 5.Moon
打开可以看到是两份程序

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743863234581-5e074605-f3bb-4b5f-b1c6-2b3ffcf44cc1.png)

# 6.Summer
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1743870339781-2d62f61f-5248-4c1f-a0a1-3358a05bcbce.png)

无壳elf，IDA见





