"use strict";

const htmlToText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getStickyValue = (post) => {
  const raw = post?.sticky ?? post?.top ?? post?.pin ?? 0;

  if (raw === true) {
    return 1;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
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

const sortPosts = (posts) =>
  asArray(posts).sort((left, right) => {
    const stickyDiff = getStickyValue(right) - getStickyValue(left);

    if (stickyDiff !== 0) {
      return stickyDiff;
    }

    const leftTime = left?.date?.valueOf?.() ?? 0;
    const rightTime = right?.date?.valueOf?.() ?? 0;
    return rightTime - leftTime;
  });

const hashText = (value) => {
  let hash = 0;

  for (const character of String(value || "")) {
    hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
};

const getTagHue = (tagName) => 18 + (hashText(String(tagName || "").trim().toLowerCase() || "tag") % 320);
const buildTagStyle = (tagName) => `--tag-hue:${getTagHue(tagName)};`;

hexo.extend.helper.register("plain_text", (value) => htmlToText(value));
hexo.extend.helper.register("sticky_value", (post) => getStickyValue(post));
hexo.extend.helper.register("sorted_posts", (posts) => sortPosts(posts));
hexo.extend.helper.register("post_summary", (post, limit = 136) =>
  htmlToText(post?.excerpt || post?.content).slice(0, limit)
);
hexo.extend.helper.register("tag_style", (tagName) => buildTagStyle(tagName));

hexo.extend.generator.register("search-index", (locals) => {
  const posts = sortPosts(locals.posts)
    .filter((post) => post.published !== false)
    .map((post) => {
      const tags = post.tags
        ? typeof post.tags.toArray === "function"
          ? post.tags.toArray().map((tag) => tag.name)
          : post.tags.map((tag) => tag.name)
        : [];

      return {
        title: post.title || "Untitled",
        path: post.path || "",
        source: post.source || post.path || "",
        date: post.date ? post.date.format("YYYY-MM-DD") : "",
        excerpt: htmlToText(post.excerpt || ""),
        content: htmlToText(post.content || ""),
        tags,
        sticky: getStickyValue(post),
      };
    });

  return {
    path: "search-index.json",
    data: JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        posts,
      },
      null,
      2
    ),
    layout: false,
  };
});
