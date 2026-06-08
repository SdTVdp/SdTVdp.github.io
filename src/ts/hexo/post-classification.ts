import { derivePostClassification } from "./_shared/post-classification-rules";
import { getTagNames, toArray } from "./_shared/post-utils";

const hasAssignedCategories = (categories: HexoRenderable["categories"]): boolean => {
  if (!categories) {
    return false;
  }

  return toArray(categories).length > 0;
};

const withDefaultTags = (post: HexoRenderable, defaultTags: string[]): Promise<unknown> | null => {
  if (defaultTags.length === 0 || typeof post.setTags !== "function") {
    return null;
  }

  const existingTags = getTagNames(post);
  const existingTagKeys = new Set(existingTags.map((tag) => tag.toLowerCase()));
  const missingTags = defaultTags.filter((tag) => !existingTagKeys.has(tag.toLowerCase()));

  if (missingTags.length === 0) {
    return null;
  }

  return post.setTags([...existingTags, ...missingTags]);
};

hexo.extend.filter.register("before_generate", () => {
  const posts = toArray(hexo.locals.get<HexoCollection<HexoRenderable>>("posts"));

  return Promise.all(
    posts.map((post) => {
      const classification = derivePostClassification(post.source);
      const tasks: Array<Promise<unknown> | null> = [];

      if (
        classification.categories.length > 0 &&
        !hasAssignedCategories(post.categories) &&
        typeof post.setCategories === "function"
      ) {
        tasks.push(post.setCategories(classification.categories));
      }

      tasks.push(withDefaultTags(post, classification.tags));

      return Promise.all(tasks.filter(Boolean));
    })
  );
});
