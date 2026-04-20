# 2026-04-21 / 01 / 结构整理与 demo 基础设施

## 本次目标

在不重构站点的前提下，先修正博客的信息架构，再给后续密码学动态演示铺好基础设施。

## 本次变更

### 1. 分类逻辑修正

- 修改 `src/ts/hexo/post-classification.ts`
- 自动分类不再把年份目录作为内容分类
- `source/_posts/<year>/<domain>/<topic>/...` 会映射成 `<domain>/<topic>`

### 2. 博客分页开启

- 修改 `_config.yml`
- 将 `/blog/` 和全局分页从 `0` 调整为 `8`

### 3. 历史 CTF 文章归档路径整理

- 将历史题解统一迁到 `source/_posts/<year>/ctf/re/`
- 保持年份作为存储层，不再作为分类层

### 4. 旧 imported 图片缓存清理

- 清理 `source/uploads/imported/2025/ctfCompetition`
- 目的是去掉旧路径残留，避免未来继续混用旧缓存目录

### 5. 动态 demo 基础设施落地

- 新增 `src/ts/client/demos/rsa-oaep-encrypt.ts`
- 新增 `src/ts/client/demos/ecdsa-sign-verify.ts`
- 新增 `source/css/demos.css`
- 修改 `_config.butterfly.yml` 注入 demo 样式和脚本

### 6. 站点模板兼容处理

- 修改 `src/ts/hexo/site-enhancements.ts`
- 统一模板局部变量，确保分页页和博客列表页能拿到稳定的 `page.posts.data`

### 7. 文档同步

- 更新 `README.md`
- 更新 `tutorial/start-here.md`
- 更新 `tutorial/guides/organization/archive-and-tags.md`
- 新增 `tutorial/guides/organization/structure-roadmap.md`

## 涉及文件

- `src/ts/hexo/post-classification.ts`
- `_config.yml`
- `_config.butterfly.yml`
- `src/ts/client/demos/rsa-oaep-encrypt.ts`
- `src/ts/client/demos/ecdsa-sign-verify.ts`
- `source/css/demos.css`
- `src/ts/hexo/site-enhancements.ts`
- `source/_posts/...`
- `source/uploads/imported/...`
- `README.md`
- `tutorial/...`

## 验证结果

- 已检查 slug 唯一性，无重复
- `npm run typecheck` 通过
- `npm run build` 通过
- 生成后的 `/blog/` 已具备分页结构
- `public/categories/crypto/public-key/index.html` 已正确生成

## 潜在风险

1. 如果旧文章仍残留手写 `categories`，可能继续保留旧分类
2. 如果某些 Markdown 手写引用了旧 imported 路径，图片仍有断链风险
3. 如果后续把新 demo 都继续塞进 `custom.ts`，会重新失去模块边界

## 回滚起点

优先按下面顺序判断是否回滚：

1. 分类异常：先看 `src/ts/hexo/post-classification.ts`
2. 博客列表异常：先看 `_config.yml`
3. demo 注入异常：先看 `_config.butterfly.yml` 和 `source/css/demos.css`
4. 图片异常：先检查 `source/uploads/imported/` 路径和文章内引用
5. 只有在确实需要时，才考虑回退 `_posts` 目录迁移
