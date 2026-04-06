export const htmlToText = (value: unknown): string =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getStickyValue = (post: Partial<HexoRenderable> | null | undefined): number => {
  const raw = post?.sticky ?? post?.top ?? post?.pin ?? 0;

  if (raw === true) {
    return 1;
  }

  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const toArray = <T>(value: HexoCollection<T> | T[] | null | undefined): T[] => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.slice();
  }

  if (typeof value.toArray === "function") {
    return value.toArray();
  }

  if (Array.isArray(value.data)) {
    return value.data.slice();
  }

  if (typeof value[Symbol.iterator] === "function") {
    return Array.from(value as Iterable<T>);
  }

  return [];
};

export const sortPosts = <T extends HexoRenderable>(posts: HexoCollection<T> | T[] | null | undefined): T[] =>
  toArray(posts).sort((left, right) => {
    const stickyDiff = getStickyValue(right) - getStickyValue(left);

    if (stickyDiff !== 0) {
      return stickyDiff;
    }

    const leftTime =
      typeof left?.date === "number" ? left.date : left?.date?.valueOf?.() ?? 0;
    const rightTime =
      typeof right?.date === "number" ? right.date : right?.date?.valueOf?.() ?? 0;
    return rightTime - leftTime;
  });

export const getTagNames = (post: HexoRenderable): string[] =>
  toArray(post.tags).map((tag) => tag.name).filter(Boolean);


