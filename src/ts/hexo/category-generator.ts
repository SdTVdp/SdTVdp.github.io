import pagination = require("hexo-pagination");
import { toArray } from "./_shared/post-utils";

hexo.config.category_generator = Object.assign(
  {
    per_page: hexo.config.per_page == null ? 10 : hexo.config.per_page,
  },
  hexo.config.category_generator
);

hexo.extend.generator.register("category", (locals: HexoLocals) => {
  const config = hexo.config;
  const perPage = config.category_generator?.per_page;
  const paginationDir = String(config.pagination_dir || "page");
  const orderBy = String(config.category_generator?.order_by || "-date");

  return toArray(locals.categories).reduce<unknown[]>((result, category) => {
    if (!category.length) {
      return result;
    }

    const posts =
      typeof category.posts.sort === "function"
        ? category.posts.sort(orderBy)
        : toArray(category.posts);

    const data = pagination(category.path, posts, {
      perPage,
      layout: ["category", "archive", "index"],
      format: `${paginationDir}/%d/`,
      data: {
        category: category.name,
      },
    });

    return result.concat(data);
  }, []);
});
