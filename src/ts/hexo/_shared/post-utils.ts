const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, token: string) => {
    const normalized = token.toLowerCase();
    const namedEntities: Record<string, string> = {
      amp: "&",
      apos: "'",
      gt: ">",
      lt: "<",
      nbsp: " ",
      quot: '"',
    };

    if (normalized.startsWith("#x")) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalized.startsWith("#")) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return namedEntities[normalized] ?? match;
  });

export const htmlToText = (value: unknown): string =>
  decodeHtmlEntities(
    String(value ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

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

    const leftTime = typeof left?.date === "number" ? left.date : left?.date?.valueOf?.() ?? 0;
    const rightTime = typeof right?.date === "number" ? right.date : right?.date?.valueOf?.() ?? 0;
    return rightTime - leftTime;
  });

export const getTagNames = (post: HexoRenderable): string[] =>
  toArray(post.tags).map((tag) => tag.name).filter(Boolean);

export const getCategoryNames = (post: HexoRenderable): string[] =>
  toArray(post.categories).map((category) => category.name).filter(Boolean);

const collectMatchedText = (html: unknown, patterns: RegExp[]): string => {
  const content = String(html ?? "");
  const fragments: string[] = [];

  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      const raw = match[3] || match[1] || "";
      const text = htmlToText(raw);
      if (text) {
        fragments.push(text);
      }
    }
  }

  return Array.from(new Set(fragments)).join(" ");
};

export const extractCodeText = (html: unknown): string =>
  collectMatchedText(html, [/<(?:pre|code)\b[^>]*>([\s\S]*?)<\/(?:pre|code)>/gi]);

export const extractFormulaText = (html: unknown): string =>
  collectMatchedText(html, [
    /<math\b[^>]*>([\s\S]*?)<\/math>/gi,
    /<([a-z0-9]+)\b(?=[^>]*\bclass=(["'])[^"']*(?:katex|math|formula)[^"']*\2)[^>]*>([\s\S]*?)<\/\1>/gi,
  ]);
