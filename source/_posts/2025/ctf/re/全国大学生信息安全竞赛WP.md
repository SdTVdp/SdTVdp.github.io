---
title: "2025_CCISC"
date: 2025-12-28 9:00:00
excerpt: "全国大学生信息安全竞赛逆向题目的wp"
slug: 2025CCISCReWP
cover: /uploads/backgrounds/CCISC.jpg
top_img: /uploads/backgrounds/CCISC.jpg
tags:
  - reverse
  - competition
---
## 1.EzFLAG
观察到加密逻辑如下



```plain
std::string::basic_string(v6, argv, envp);
  std::operator<<<std::char_traits<char>>(&std::cout, "Enter password: ");
  std::getline<char,std::char_traits<char>,std::allocator<char>>(&std::cin, v6);
  if ( (unsigned __int8)std::operator!=<char>(v6, "V3ryStr0ngp@ssw0rd") )
  {
    v3 = std::operator<<<std::char_traits<char>>(&std::cout, "Wrong password!");
    std::ostream::operator<<(v3, &std::endl<char,std::char_traits<char>>);
  }
  else
  {
    std::operator<<<std::char_traits<char>>(&std::cout, "flag{");
    std::ostream::flush((std::ostream *)&std::cout);
    v11 = 1;
    for ( i = 0; i <= 31; ++i )
    {
      v9 = f(v11);
      std::operator<<<std::char_traits<char>>(&std::cout, (unsigned int)v9);
      std::ostream::flush((std::ostream *)&std::cout);
      if ( i == 7 || i == 12 || i == 17 || i == 22 )
      {
        std::operator<<<std::char_traits<char>>(&std::cout, "-");
        std::ostream::flush((std::ostream *)&std::cout);
      }
      v11 *= 8LL;
      v11 += i + 64;
      v8 = 1;
      std::chrono::duration<long,std::ratio<1l,1l>>::duration<int,void>(v7, &v8);
      std::this_thread::sleep_for<long,std::ratio<1l,1l>>(v7);
    }
    v4 = std::operator<<<std::char_traits<char>>(&std::cout, "}");
    std::ostream::operator<<(v4, &std::endl<char,std::char_traits<char>>);
  }
  std::string::~string(v6);
  return 0;
}
```

## 2.EzGame
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766899553695-3460aa22-78f2-4d08-8ace-58914c2ce114.png)

打开是一个游戏，打开godot re tools可以解包

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766904881253-dd68c71c-e93b-41ee-991f-b5d0782da934.png)

直接搜索flag就能找到加密逻辑

```plain
extends CenterContainer

@onready var flagTextEdit: Node = $PanelContainer / VBoxContainer / FlagTextEdit
@onready var label2: Node = $PanelContainer / VBoxContainer / Label2

static var key = "FanAglFanAglOoO!"
var data = ""

func _on_ready() -> void :
    Flag.hide()

func get_key() -> String:
    return key

func submit() -> void :
    data = flagTextEdit.text

    var aes = AESContext.new()
    aes.start(AESContext.MODE_ECB_ENCRYPT, key.to_utf8_buffer())
    var encrypted = aes.update(data.to_utf8_buffer())
    aes.finish()

    if encrypted.hex_encode() == "d458af702a680ae4d089ce32fc39945d":
        label2.show()
    else:
        label2.hide()

func back() -> void :
    get_tree().change_scene_to_file("res://scenes/menu.tscn")
```

看到是一个没有IV的AES，采用ECB方式加密

然后cyberchef一炒就行，key就是通关游戏挑出来的那个

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2025/png/50154293/1766905006428-7a464cd2-7f86-4978-89ef-9e2ae2b82a29.png)

得到flag{wOW~youAregrEaT!}





