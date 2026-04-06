import { toArray } from "./_shared/post-utils";

const hasAssignedCategories = (categories: HexoRenderable["categories"]): boolean => {
  if (!categories) {
    return false;
  }

  return toArray(categories).length > 0;
};

const deriveCategoriesFromSource = (source: unknown): string[] => {
  const normalized = String(source ?? "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const postRootIndex = parts.indexOf("_posts");

  if (postRootIndex === -1 || parts.length <= postRootIndex + 2) {
    return [];
  }

  return parts.slice(postRootIndex + 1, -1).slice(0, 3);
};

hexo.extend.filter.register("before_generate", () => {
  const posts = toArray(hexo.locals.get<HexoCollection<HexoRenderable>>("posts"));

  return Promise.all(
    posts.map((post) => {
      if (hasAssignedCategories(post.categories) || typeof post.setCategories !== "function") {
        return null;
      }

      const categories = deriveCategoriesFromSource(post.source);
      if (categories.length === 0) {
        return null;
      }

      return post.setCategories(categories);
    })
  );
});
