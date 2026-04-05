"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const IMPORT_ROOT = "uploads/imported";
const SOURCE_IMPORT_ROOT = path.join(hexo.source_dir, IMPORT_ROOT);
const SEARCHABLE_IMAGE_EXTENSIONS = new Set([
  ".apng",
  ".avif",
  ".bmp",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);

const remoteAssetMemo = new Map();
let sourceAssetIndexPromise = null;

const ensureDir = (target) => fs.mkdir(target, { recursive: true });
const normalizeSlashes = (value) => String(value || "").replace(/\\/g, "/");
const stripLeadingSlashes = (value) => normalizeSlashes(value).replace(/^\/+/, "");
const stripQueryAndHash = (value) => String(value || "").replace(/[?#].*$/, "");
const isRemoteUrl = (value) => /^https?:\/\//i.test(String(value || "").trim());
const isDataUrl = (value) => /^data:/i.test(String(value || "").trim());
const isSiteAbsolute = (value) => String(value || "").trim().startsWith("/");

const sanitizeSegment = (value) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+|-+$/g, "");

  return cleaned || "asset";
};

const slugifyPostSource = (source) => {
  const normalized = stripLeadingSlashes(source);
  const parts = normalizeSlashes(normalized).split("/").filter(Boolean);
  const postRootIndex = parts.indexOf("_posts");
  const scopedParts = postRootIndex === -1 ? parts : parts.slice(postRootIndex + 1);
  const parsed = path.parse(scopedParts.join("/"));
  const folder = normalizeSlashes(parsed.dir)
    .split("/")
    .filter(Boolean)
    .map(sanitizeSegment);
  const basename = sanitizeSegment(parsed.name);

  return [...folder, basename].join("/");
};

const normalizeTarget = (value) => {
  const trimmed = String(value || "").trim();

  if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
};

const splitMarkdownDestination = (rawTarget) => {
  const normalized = normalizeTarget(rawTarget);
  const titleMatch = normalized.match(/^((?:\\.|[^\s])(?:.*?))(?:\s+((["']).*?\3))?$/);

  if (!titleMatch) {
    return {
      url: normalized,
      suffix: "",
    };
  }

  return {
    url: titleMatch[1].trim(),
    suffix: titleMatch[2] ? ` ${titleMatch[2].trim()}` : "",
  };
};

const decodePathLike = (value) => {
  const normalized = String(value || "").trim().replace(/&amp;/g, "&");

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

const resolveExtensionFromType = (contentType) => {
  const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();

  switch (normalized) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/gif":
      return ".gif";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    case "image/avif":
      return ".avif";
    case "image/bmp":
      return ".bmp";
    default:
      return ".img";
  }
};

const getRemoteAssetBase = (url) => crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);

const listExistingRemoteCandidates = async (directory, baseName) => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${baseName}.`))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
};

const resolveImageFiles = async (directory, bucket) => {
  let entries = [];

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return bucket;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      const normalizedAbsolute = normalizeSlashes(absolute);
      const normalizedImportRoot = normalizeSlashes(SOURCE_IMPORT_ROOT);

      if (normalizedAbsolute.startsWith(normalizedImportRoot)) {
        return;
      }

      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "public" || entry.name.startsWith(".git")) {
          return;
        }

        await resolveImageFiles(absolute, bucket);
        return;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!SEARCHABLE_IMAGE_EXTENSIONS.has(extension)) {
        return;
      }

      const basename = entry.name.toLowerCase();
      const known = bucket.get(basename) || [];
      known.push(absolute);
      bucket.set(basename, known);
    })
  );

  return bucket;
};

const buildSourceAssetIndex = async () => {
  if (!sourceAssetIndexPromise) {
    sourceAssetIndexPromise = resolveImageFiles(hexo.source_dir, new Map());
  }

  return sourceAssetIndexPromise;
};

const resolveLocalImageSource = async (rawTarget, context) => {
  const cleaned = stripQueryAndHash(
    decodePathLike(rawTarget)
      .replace(/^\.\/+/, "")
      .replace(/\\/g, "/")
      .replace(/^file:\/\//i, "")
  );

  const candidates = [];
  if (path.isAbsolute(cleaned)) {
    candidates.push(cleaned);
  }

  candidates.push(
    path.resolve(context.postDirectory, cleaned),
    path.resolve(context.postAssetDirectory, cleaned)
  );

  if (cleaned.startsWith("../") || cleaned.startsWith("./")) {
    candidates.push(path.resolve(hexo.source_dir, cleaned));
  }

  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {}
  }

  const basename = path.basename(cleaned).toLowerCase();
  if (!basename) {
    return null;
  }

  const index = await buildSourceAssetIndex();
  const matches = index.get(basename) || [];

  return matches[0] || null;
};

const importRemoteAsset = async (url, context) => {
  const memoKey = `${context.assetScope}::${url}`;
  if (remoteAssetMemo.has(memoKey)) {
    return remoteAssetMemo.get(memoKey);
  }

  const task = (async () => {
    const directory = path.join(SOURCE_IMPORT_ROOT, context.assetScope);
    await ensureDir(directory);

    const baseName = getRemoteAssetBase(url);
    const existing = await listExistingRemoteCandidates(directory, baseName);
    if (existing[0]) {
      return existing[0];
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const parsed = new URL(url);
    const urlExtension = path.extname(parsed.pathname || "");
    const extension = SEARCHABLE_IMAGE_EXTENSIONS.has(urlExtension.toLowerCase())
      ? urlExtension
      : resolveExtensionFromType(response.headers.get("content-type"));
    const filename = `${baseName}${extension}`;
    const absolutePath = path.join(directory, filename);

    await fs.writeFile(absolutePath, buffer);
    return absolutePath;
  })();

  remoteAssetMemo.set(memoKey, task);
  return task;
};

const importLocalAsset = async (absoluteSourcePath, context) => {
  const fileName = sanitizeSegment(path.basename(absoluteSourcePath));
  const targetDirectory = path.join(SOURCE_IMPORT_ROOT, context.assetScope);
  const targetPath = path.join(targetDirectory, fileName);

  await ensureDir(targetDirectory);

  try {
    const sourceStats = await fs.stat(absoluteSourcePath);
    const targetStats = await fs.stat(targetPath);

    if (targetStats.size === sourceStats.size && targetStats.mtimeMs >= sourceStats.mtimeMs) {
      return targetPath;
    }
  } catch {}

  await fs.copyFile(absoluteSourcePath, targetPath);
  return targetPath;
};

const toImportedUrl = (absoluteAssetPath) => {
  const relative = stripLeadingSlashes(path.relative(hexo.source_dir, absoluteAssetPath));
  return `/${normalizeSlashes(relative)}`;
};

const toContext = (data) => {
  const source = stripLeadingSlashes(data.source || "");
  const sourceAbsolute = path.join(hexo.source_dir, source);
  const parsed = path.parse(sourceAbsolute);

  return {
    source,
    sourceAbsolute,
    postDirectory: parsed.dir,
    postAssetDirectory: path.join(parsed.dir, parsed.name),
    assetScope: slugifyPostSource(source),
  };
};

const importImageTarget = async (rawTarget, context) => {
  const target = normalizeTarget(rawTarget);

  if (!target || isDataUrl(target) || isSiteAbsolute(target)) {
    return target;
  }

  if (isRemoteUrl(target)) {
    try {
      const absoluteAssetPath = await importRemoteAsset(target, context);
      return toImportedUrl(absoluteAssetPath);
    } catch (error) {
      hexo.log.warn(`[markdown-image-importer] 下载远程图片失败: ${target} (${error.message})`);
      return target;
    }
  }

  const localSource = await resolveLocalImageSource(target, context);
  if (!localSource) {
    return target;
  }

  const absoluteAssetPath = await importLocalAsset(localSource, context);
  return toImportedUrl(absoluteAssetPath);
};

const replaceAsync = async (input, pattern, replacer) => {
  const matches = [...input.matchAll(pattern)];
  if (matches.length === 0) {
    return input;
  }

  const fragments = [];
  let lastIndex = 0;

  for (const match of matches) {
    const index = match.index || 0;
    fragments.push(input.slice(lastIndex, index));
    fragments.push(await replacer(match));
    lastIndex = index + match[0].length;
  }

  fragments.push(input.slice(lastIndex));
  return fragments.join("");
};

const rewriteObsidianImages = (content, context) =>
  replaceAsync(content, /!\[\[([^\]]+)\]\]/g, async (match) => {
    const rawToken = match[1].split("|")[0].trim();
    const imported = await importImageTarget(rawToken, context);
    return `![](${imported})`;
  });

const rewriteMarkdownImages = (content, context) =>
  replaceAsync(content, /!\[([^\]]*)\]\(([^)\n]+)\)/g, async (match) => {
    const parsed = splitMarkdownDestination(match[2]);
    const imported = await importImageTarget(parsed.url, context);

    return `![${match[1]}](${imported}${parsed.suffix})`;
  });

const rewriteHtmlImages = (content, context) =>
  replaceAsync(content, /<img\b([^>]*?)\bsrc=(["'])(.+?)\2([^>]*)>/gi, async (match) => {
    const imported = await importImageTarget(match[3], context);
    return `<img${match[1]}src=${match[2]}${imported}${match[2]}${match[4]}>`;
  });

hexo.extend.filter.register("after_init", () => {
  sourceAssetIndexPromise = null;
});

hexo.extend.filter.register("before_post_render", async (data) => {
  if (!data || !data.source || !String(data.source).includes("_posts")) {
    return data;
  }

  const context = toContext(data);
  const original = String(data.content || "");

  let rewritten = await rewriteObsidianImages(original, context);
  rewritten = await rewriteMarkdownImages(rewritten, context);
  rewritten = await rewriteHtmlImages(rewritten, context);

  data.content = rewritten;
  return data;
});

const collectImportedRoutes = async (directory, bucket) => {
  let entries = [];

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return bucket;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await collectImportedRoutes(absolute, bucket);
        return;
      }

      const relative = stripLeadingSlashes(path.relative(hexo.source_dir, absolute));
      bucket.push({
        path: normalizeSlashes(relative),
        data: () => fs.readFile(absolute),
      });
    })
  );

  return bucket;
};

hexo.extend.generator.register("imported-images", async () => {
  return collectImportedRoutes(SOURCE_IMPORT_ROOT, []);
});
