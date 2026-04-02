"use strict";

const pagination = require("hexo-pagination");

const topValue = (post) => {
  const raw = post?.top ?? 0;

  if (raw === true) {
    return 1;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

hexo.extend.generator.register("blog-index", function (locals) {
  const config = this.config;
  const posts = locals.posts;

  posts.data = posts.data
    .filter((post) => post.published !== false)
    .sort((left, right) => {
      const topDiff = topValue(right) - topValue(left);

      if (topDiff !== 0) {
        return topDiff;
      }

      return right.date - left.date;
    });

  const paginationDir = config.pagination_dir || "page";
  const indexPath = (config.index_generator && config.index_generator.path) || "blog";

  return pagination(indexPath, posts, {
    perPage: config.index_generator.per_page,
    layout: ["index", "archive"],
    format: `${paginationDir}/%d/`,
    data: {
      __index: true,
    },
  });
});
