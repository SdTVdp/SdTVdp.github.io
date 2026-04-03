"use strict";

const hasAssignedCategories = (categories) => {
  if (!categories) {
    return false;
  }

  if (Array.isArray(categories)) {
    return categories.length > 0;
  }

  if (typeof categories.toArray === "function") {
    return categories.toArray().length > 0;
  }

  if (typeof categories.length === "number") {
    return categories.length > 0;
  }

  return String(categories).trim().length > 0;
};

const deriveCategoriesFromSource = (source) => {
  const normalized = String(source || "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const postRootIndex = parts.indexOf("_posts");

  if (postRootIndex === -1 || parts.length <= postRootIndex + 2) {
    return [];
  }

  return parts.slice(postRootIndex + 1, -1).slice(0, 2);
};

const asArray = (posts) => {
  if (!posts) {
    return [];
  }

  if (Array.isArray(posts)) {
    return posts.slice();
  }

  if (typeof posts.toArray === "function") {
    return posts.toArray();
  }

  return Array.from(posts);
};

hexo.extend.filter.register("before_generate", () => {
  const posts = asArray(hexo.locals.get("posts"));

  return Promise.all(
    posts.map((post) => {
      if (hasAssignedCategories(post.categories) || typeof post?.setCategories !== "function") {
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
