import crypto from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import {
  ensureDir,
  getWorkspaceRoot,
  isDataUrl,
  isRemoteUrl,
  isSiteAbsolute,
  isWithinDirectory,
  normalizeSlashes,
  optimizeImageAtPath,
  optimizeSitePath,
  stripLeadingSlashes,
  stripQueryAndHash,
  toSitePath,
} from "./_shared/image-pipeline";

const IMPORT_ROOT = "uploads/imported";
const SOURCE_IMPORT_ROOT = path.join(hexo.source_dir, IMPORT_ROOT);
const MAX_REMOTE_IMAGE_BYTES = 20 * 1024 * 1024;
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

type IndexedImageMap = Map<string, string[]>;

interface ImportContext {
  source: string;
  sourceAbsolute: string;
  postDirectory: string;
  postAssetDirectory: string;
  assetScope: string;
}

const remoteAssetMemo = new Map<string, Promise<string>>();
let sourceAssetIndexPromise: Promise<IndexedImageMap> | null = null;

const sanitizeSegment = (value: unknown): string => {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .replace(/^-+|-+$/g, "");

  return cleaned || "asset";
};

const slugifyPostSource = (source: string): string => {
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

const normalizeTarget = (value: unknown): string => {
  const trimmed = String(value ?? "").trim();
  return trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1).trim() : trimmed;
};

const splitMarkdownDestination = (rawTarget: string): { url: string; suffix: string } => {
  const normalized = normalizeTarget(rawTarget);
  const titleMatch = normalized.match(/^((?:\\.|[^\s])(?:.*?))(?:\s+((["']).*?\3))?$/);

  if (!titleMatch) {
    return { url: normalized, suffix: "" };
  }

  return {
    url: titleMatch[1].trim(),
    suffix: titleMatch[2] ? ` ${titleMatch[2].trim()}` : "",
  };
};

const decodePathLike = (value: unknown): string => {
  const normalized = String(value ?? "").trim().replace(/&amp;/g, "&");

  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
};

const resolveExtensionFromType = (contentType: string | null): string => {
  const normalized = String(contentType ?? "").split(";")[0].trim().toLowerCase();

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

const getRemoteAssetBase = (url: string): string =>
  crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);

const hasSupportedImageExtension = (filePath: string): boolean =>
  SEARCHABLE_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const isUnsafeIpv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map((segment) => Number.parseInt(segment, 10));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const isUnsafeIpv6 = (hostname: string): boolean => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
};

const assertSafeRemoteUrl = (input: string): URL => {
  const parsed = new URL(input);
  const hostname = parsed.hostname.toLowerCase();
  const ipVersion = net.isIP(hostname);

  if (!/^https?:$/i.test(parsed.protocol)) {
    throw new Error(`unsupported protocol: ${parsed.protocol}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error("credentialed remote URLs are not allowed");
  }

  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    (ipVersion === 4 && isUnsafeIpv4(hostname)) ||
    (ipVersion === 6 && isUnsafeIpv6(hostname))
  ) {
    throw new Error(`blocked remote host: ${hostname}`);
  }

  return parsed;
};

const readResponseBuffer = async (response: Response, maxBytes: number): Promise<Buffer> => {
  const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`remote image too large: ${contentLength} bytes`);
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) {
      throw new Error(`remote image too large: ${buffer.length} bytes`);
    }

    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const chunk = Buffer.from(value);
    total += chunk.length;

    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new Error(`remote image too large: ${total} bytes`);
    }

    chunks.push(chunk);
  }

  return Buffer.concat(chunks, total);
};

const listExistingRemoteCandidates = async (directory: string, baseName: string): Promise<string[]> => {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.startsWith(`${baseName}.`))
      .map((entry) => path.join(directory, entry.name));
  } catch {
    return [];
  }
};

const resolveImageFiles = async (directory: string, bucket: IndexedImageMap): Promise<IndexedImageMap> => {
  let entries: Dirent<string>[] = [];

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

const buildSourceAssetIndex = async (): Promise<IndexedImageMap> => {
  if (!sourceAssetIndexPromise) {
    sourceAssetIndexPromise = resolveImageFiles(hexo.source_dir, new Map());
  }

  return sourceAssetIndexPromise;
};

const getAllowedLocalRoots = (context: ImportContext): string[] => [
  context.postDirectory,
  context.postAssetDirectory,
  hexo.source_dir,
  getWorkspaceRoot(),
];

const isAllowedLocalAssetPath = (candidate: string, context: ImportContext): boolean =>
  getAllowedLocalRoots(context).some((root) => isWithinDirectory(candidate, root));

const resolveLocalImageSource = async (rawTarget: string, context: ImportContext): Promise<string | null> => {
  const cleaned = stripQueryAndHash(
    decodePathLike(rawTarget)
      .replace(/^\.\/+/, "")
      .replace(/\\/g, "/")
      .replace(/^file:\/\//i, "")
  );

  const candidates: string[] = [];
  if (path.isAbsolute(cleaned)) {
    candidates.push(cleaned);
  }

  candidates.push(path.resolve(context.postDirectory, cleaned), path.resolve(context.postAssetDirectory, cleaned));

  if (cleaned.startsWith("../") || cleaned.startsWith("./")) {
    candidates.push(path.resolve(hexo.source_dir, cleaned));
  }

  for (const candidate of candidates) {
    if (!hasSupportedImageExtension(candidate) || !isAllowedLocalAssetPath(candidate, context)) {
      continue;
    }

    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  const basename = path.basename(cleaned).toLowerCase();
  if (!basename) {
    return null;
  }

  const index = await buildSourceAssetIndex();
  const matches = index.get(basename) || [];
  return matches.find((match) => isAllowedLocalAssetPath(match, context)) || null;
};

const importRemoteAsset = async (url: string, context: ImportContext): Promise<string> => {
  const memoKey = `${context.assetScope}::${url}`;
  if (remoteAssetMemo.has(memoKey)) {
    return remoteAssetMemo.get(memoKey)!;
  }

  const task = (async () => {
    const directory = path.join(SOURCE_IMPORT_ROOT, context.assetScope);
    await ensureDir(directory);

    const parsedUrl = assertSafeRemoteUrl(url);
    const baseName = getRemoteAssetBase(parsedUrl.toString());
    const existing = await listExistingRemoteCandidates(directory, baseName);
    if (existing[0]) {
      return existing[0];
    }

    const response = await fetch(parsedUrl, {
      signal: AbortSignal.timeout(20000),
      headers: {
        "user-agent": "sdtvdp-hexo-image-importer",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.toLowerCase().startsWith("image/")) {
      throw new Error(`unsupported content-type: ${contentType}`);
    }

    const buffer = await readResponseBuffer(response, MAX_REMOTE_IMAGE_BYTES);
    const urlExtension = path.extname(parsedUrl.pathname || "").toLowerCase();
    const extension = SEARCHABLE_IMAGE_EXTENSIONS.has(urlExtension)
      ? urlExtension
      : resolveExtensionFromType(contentType);
    const filename = `${baseName}${extension}`;
    const absolutePath = path.join(directory, filename);

    await fs.writeFile(absolutePath, buffer);
    return absolutePath;
  })().catch((error) => {
    remoteAssetMemo.delete(memoKey);
    throw error;
  });

  remoteAssetMemo.set(memoKey, task);
  return task;
};

const importLocalAsset = async (absoluteSourcePath: string, context: ImportContext): Promise<string> => {
  const fileName = sanitizeSegment(path.basename(absoluteSourcePath));
  const targetDirectory = path.join(SOURCE_IMPORT_ROOT, context.assetScope);
  const targetPath = path.join(targetDirectory, fileName);

  await ensureDir(targetDirectory);

  const [sourceStats, targetStats] = await Promise.all([
    fs.stat(absoluteSourcePath),
    fs.stat(targetPath).catch(() => null),
  ]);

  if (targetStats && targetStats.size === sourceStats.size && targetStats.mtimeMs >= sourceStats.mtimeMs) {
    return targetPath;
  }

  await fs.copyFile(absoluteSourcePath, targetPath);
  return targetPath;
};

const toContext = (data: HexoRenderable): ImportContext => {
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

const importImageTarget = async (rawTarget: string, context: ImportContext): Promise<string> => {
  const target = normalizeTarget(rawTarget);

  if (!target || isDataUrl(target)) {
    return target;
  }

  if (isSiteAbsolute(target)) {
    return optimizeSitePath(target);
  }

  if (isRemoteUrl(target)) {
    try {
      const absoluteAssetPath = await importRemoteAsset(target, context);
      const optimizedAssetPath = await optimizeImageAtPath(absoluteAssetPath);
      return toSitePath(optimizedAssetPath);
    } catch (error) {
      hexo.log.warn(
        `[markdown-image-importer] 下载远程图片失败: ${target} (${error instanceof Error ? error.message : String(error)})`
      );
      return target;
    }
  }

  const localSource = await resolveLocalImageSource(target, context);
  if (!localSource) {
    return target;
  }

  const absoluteAssetPath = await importLocalAsset(localSource, context);
  const optimizedAssetPath = await optimizeImageAtPath(absoluteAssetPath);
  return toSitePath(optimizedAssetPath);
};

const replaceAsync = async (
  input: string,
  pattern: RegExp,
  replacer: (match: RegExpMatchArray) => Promise<string>
): Promise<string> => {
  const matches = [...input.matchAll(pattern)];
  if (matches.length === 0) {
    return input;
  }

  const fragments: string[] = [];
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

const rewriteObsidianImages = (content: string, context: ImportContext): Promise<string> =>
  replaceAsync(content, /!\[\[([^\]]+)\]\]/g, async (match) => {
    const rawToken = match[1].split("|")[0].trim();
    const imported = await importImageTarget(rawToken, context);
    return `![](${imported})`;
  });

const rewriteMarkdownImages = (content: string, context: ImportContext): Promise<string> =>
  replaceAsync(content, /!\[([^\]]*)\]\(([^)\n]+)\)/g, async (match) => {
    const parsed = splitMarkdownDestination(match[2]);
    const imported = await importImageTarget(parsed.url, context);

    return `![${match[1]}](${imported}${parsed.suffix})`;
  });

const rewriteHtmlImages = (content: string, context: ImportContext): Promise<string> =>
  replaceAsync(content, /<img\b([^>]*?)\bsrc=(["'])(.+?)\2([^>]*)>/gi, async (match) => {
    const imported = await importImageTarget(match[3], context);
    return `<img${match[1]}src=${match[2]}${imported}${match[2]}${match[4]}>`;
  });

hexo.extend.filter.register("after_init", () => {
  sourceAssetIndexPromise = null;
});

hexo.extend.filter.register("before_post_render", async (data: HexoRenderable) => {
  if (!data?.source || !String(data.source).includes("_posts")) {
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

const collectImportedRoutes = async (directory: string, bucket: Array<{ path: string; data: () => Promise<Buffer> }>) => {
  let entries: Dirent<string>[] = [];

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

hexo.extend.generator.register("imported-images", async () => collectImportedRoutes(SOURCE_IMPORT_ROOT, []));