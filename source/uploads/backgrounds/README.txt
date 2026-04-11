博客正文后面的整页底层背景使用下面这两个固定文件名：

- blog-body-background-light.webp
- blog-body-background-dark.webp

也支持这些扩展名：

- .avif
- .png
- .jpg
- .jpeg
- .gif

推荐优先使用：

- blog-body-background-light.avif 或 blog-body-background-light.webp
- blog-body-background-dark.avif 或 blog-body-background-dark.webp

显示规则：

- 浅色模式会自动读取 blog-body-background-light.*
- 深色模式会自动读取 blog-body-background-dark.*
- 图片会以 contain 方式完整显示
- 没有被图片覆盖到的区域会保留主题原本的浅蓝色或 #1f1e33

不需要额外改配置文件，放进这个目录后重新执行：

  npm run build
