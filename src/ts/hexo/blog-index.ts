import pagination = require("hexo-pagination");
import { getStickyValue, sortPosts } from "./_shared/post-utils";

hexo.extend.generator.register("blog-index", (locals: HexoLocals) => {
  const config = hexo.config;
  const sortedPosts = sortPosts(locals.posts).filter((post) => post.published !== false);
  const posts = (locals.posts || { data: [] }) as HexoCollection<HexoRenderable> & { data?: HexoRenderable[] };
  posts.data = sortedPosts;

  const paginationDir = String(config.pagination_dir || "page");
  const indexPath = String(config.index_generator?.path || "blog");

  return pagination(indexPath, posts, {
    perPage: config.index_generator?.per_page ?? 0,
    layout: ["index", "archive"],
    format: `${paginationDir}/%d/`,
    data: {
      __index: true,
      sticky_value: getStickyValue,
    },
  });
});
