export interface PostClassification {
  categories: string[];
  tags: string[];
}

interface PathRule {
  prefix: string[];
  categories: string[];
  tags: string[];
}

const PATH_RULES: PathRule[] = [
  {
    prefix: ["archive", "ctf"],
    categories: ["历史 WP"],
    tags: ["ctf-wp", "re-history"],
  },
  {
    prefix: ["series", "re-technical-notes"],
    categories: ["技术笔记"],
    tags: ["re-tech-note", "vm-analysis", "crypto"],
  },
  {
    prefix: ["research", "ai"],
    categories: ["科研日志"],
    tags: [
      "ai-explainable",
      "deep-learning",
      "transformer",
      "self-supervised",
      "tda",
      "fluid-dynamics",
    ],
  },
];

const normalizeSourceParts = (source: unknown): string[] => {
  const normalized = String(source ?? "").replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  const postRootIndex = parts.indexOf("_posts");

  if (postRootIndex === -1 || parts.length <= postRootIndex + 2) {
    return [];
  }

  return parts.slice(postRootIndex + 1, -1);
};

const matchesPrefix = (parts: string[], prefix: string[]): boolean =>
  prefix.every((segment, index) => parts[index] === segment);

const deriveCategoriesFromParts = (parts: string[]): string[] => {
  const categoryStart = /^\d{4}$/.test(parts[0] ?? "") ? parts.slice(1) : parts;
  return categoryStart.filter(Boolean).slice(0, 3);
};

export const derivePostClassification = (source: unknown): PostClassification => {
  const parts = normalizeSourceParts(source);

  if (parts.length === 0) {
    return { categories: [], tags: [] };
  }

  const matchedRule = PATH_RULES.find((rule) => matchesPrefix(parts, rule.prefix));
  if (matchedRule) {
    return {
      categories: matchedRule.categories.slice(),
      tags: matchedRule.tags.slice(),
    };
  }

  return {
    categories: deriveCategoriesFromParts(parts),
    tags: [],
  };
};
