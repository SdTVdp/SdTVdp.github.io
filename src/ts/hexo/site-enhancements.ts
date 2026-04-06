import { optimizeSitePath } from "./_shared/image-pipeline";
import { getStickyValue, getTagNames, htmlToText, sortPosts, toArray } from "./_shared/post-utils";

const asRenderableList = (name: "posts" | "pages"): HexoRenderable[] =>
  toArray(hexo.locals.get<HexoCollection<HexoRenderable>>(name));

const hashText = (value: unknown): number => {
  let hash = 0;

  for (const character of String(value ?? "")) {
    hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
};

const getTagHue = (tagName: unknown): number =>
  18 + (hashText(String(tagName ?? "").trim().toLowerCase() || "tag") % 320);

const buildTagStyle = (tagName: unknown): string => `--tag-hue:${getTagHue(tagName)};`;

const syncExcerptToDescription = (entry: HexoRenderable): boolean => {
  const excerpt = htmlToText(entry.excerpt);

  if (!excerpt || htmlToText(entry.description)) {
    return false;
  }

  if (typeof entry.set === "function") {
    entry.set("description", excerpt);
  } else {
    entry.description = excerpt;
  }

  if (Object.prototype.hasOwnProperty.call(entry, "postDesc")) {
    entry.postDesc = undefined;
  }

  return true;
};

const setEntryValue = (entry: HexoRenderable, key: string, value: unknown): boolean => {
  if (entry[key] === value) {
    return false;
  }

  if (typeof entry.set === "function") {
    entry.set(key, value);
  } else {
    entry[key] = value;
  }

  return true;
};

const optimizeImageValue = async (value: string | string[] | false | undefined): Promise<typeof value> => {
  if (value === false || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    const optimized = await Promise.all(
      value.map(async (item) => (typeof item === "string" ? optimizeSitePath(item) : item))
    );
    return optimized;
  }

  if (typeof value !== "string") {
    return value;
  }

  return optimizeSitePath(value);
};

const optimizeEntryImages = async (entry: HexoRenderable): Promise<boolean> => {
  let changed = false;

  for (const field of ["cover", "top_img"] as const) {
    const currentValue = entry[field];
    const optimizedValue = await optimizeImageValue(currentValue);
    changed = setEntryValue(entry, field, optimizedValue) || changed;
  }

  return changed;
};

const buildPostDescription = (entry: HexoRenderable): string => {
  const explicit = htmlToText(entry.excerpt || entry.description || "");
  const content = htmlToText(entry.content || "");
  const { length = 180, method } = hexo.theme.config.index_post_content || {};

  if (method === false) {
    return "";
  }

  if (method === 1) {
    return explicit;
  }

  if (method === 2) {
    return explicit || content.slice(0, length);
  }

  return content.slice(0, length);
};

const optimizeThemeImages = async (): Promise<void> => {
  const themeConfig = hexo.theme.config;
  const imageKeys = ["default_top_img", "index_img", "archive_img", "tag_img"] as const;

  for (const key of imageKeys) {
    if (typeof themeConfig[key] === "string") {
      themeConfig[key] = await optimizeSitePath(themeConfig[key]);
    }
  }

  const defaultCover = themeConfig.cover?.default_cover;
  if (Array.isArray(defaultCover)) {
    themeConfig.cover.default_cover = await Promise.all(
      defaultCover.map(async (entry: unknown) => (typeof entry === "string" ? optimizeSitePath(entry) : entry))
    );
  }
};

hexo.extend.filter.register("before_post_render", async (data: HexoRenderable) => {
  syncExcerptToDescription(data);
  await optimizeEntryImages(data);
  return data;
});

hexo.extend.filter.register("before_generate", async () => {
  await optimizeThemeImages();

  const entries = [...asRenderableList("posts"), ...asRenderableList("pages")];
  const saveTasks: Array<Promise<unknown>> = [];

  for (const entry of entries) {
    let changed = syncExcerptToDescription(entry);
    changed = (await optimizeEntryImages(entry)) || changed;

    const sticky = getStickyValue(entry);
    if (sticky > 0 && !entry.top) {
      changed = setEntryValue(entry, "top", sticky) || changed;
    }

    if (changed && typeof entry.save === "function") {
      saveTasks.push(entry.save());
    }
  }

  await Promise.all(saveTasks);
});

const registerPostDescHelper = (): void => {
  hexo.extend.helper.register("postDesc", (entry: HexoRenderable) => {
    const result = buildPostDescription(entry);

    if (entry && typeof entry === "object") {
      entry.postDesc = result;
    }

    return result;
  });
};

hexo.extend.helper.register("plain_text", (value: unknown) => htmlToText(value));
registerPostDescHelper();
hexo.on("generateBefore", registerPostDescHelper);
hexo.extend.helper.register("sticky_value", (post: HexoRenderable) => getStickyValue(post));
hexo.extend.helper.register("sorted_posts", (posts: HexoCollection<HexoRenderable>) => sortPosts(posts));
hexo.extend.helper.register("post_summary", (post: HexoRenderable, limit = 136) =>
  htmlToText(post.excerpt || post.description || post.content).slice(0, limit)
);
hexo.extend.helper.register("tag_style", (tagName: unknown) => buildTagStyle(tagName));

hexo.extend.generator.register("search-index", (locals: HexoLocals) => {
  const posts = sortPosts(locals.posts)
    .filter((post) => post.published !== false)
    .map((post) => ({
      title: post.title || "Untitled",
      path: post.path || "",
      source: post.source || post.path || "",
      date: typeof post.date === "number" ? "" : post.date?.format?.("YYYY-MM-DD") || "",
      excerpt: htmlToText(post.excerpt || ""),
      description: htmlToText(post.description || ""),
      content: htmlToText(post.content || ""),
      tags: getTagNames(post),
      sticky: getStickyValue(post),
    }));

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
