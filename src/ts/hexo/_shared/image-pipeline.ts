import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type OptimizedImageFormat = "webp" | "avif";

interface ImagePipelineConfig {
  enabled: boolean;
  format: OptimizedImageFormat;
  quality: number;
  effort: number;
  passthrough: Set<string>;
}

const CONVERTIBLE_EXTENSIONS = new Set([".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff"]);
const DEFAULT_PASSTHROUGH = [".apng", ".avif", ".gif", ".svg", ".webp"];

const getHexoContext = (): HexoContext => {
  const context = globalThis.__sdtvdpHexoContext;

  if (!context) {
    throw new Error("[hexo-typescript] Hexo context is not ready for the image pipeline.");
  }

  return context;
};

export const normalizeSlashes = (value: unknown): string => String(value ?? "").replace(/\\/g, "/");
export const stripLeadingSlashes = (value: unknown): string => normalizeSlashes(value).replace(/^\/+/, "");
export const stripQueryAndHash = (value: unknown): string => String(value ?? "").replace(/[?#].*$/, "");
export const isRemoteUrl = (value: unknown): boolean => /^https?:\/\//i.test(String(value ?? "").trim());
export const isDataUrl = (value: unknown): boolean => /^data:/i.test(String(value ?? "").trim());
export const isSiteAbsolute = (value: unknown): boolean => String(value ?? "").trim().startsWith("/");
export const getWorkspaceRoot = (): string => path.resolve(getHexoContext().base_dir || process.cwd());
export const isWithinDirectory = (target: string, root: string): boolean => {
  const resolvedTarget = path.resolve(target);
  const resolvedRoot = path.resolve(root);
  const relative = path.relative(resolvedRoot, resolvedTarget);

  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

export const ensureDir = async (target: string): Promise<void> => {
  await fs.mkdir(target, { recursive: true });
};

const maybeStat = async (target: string): Promise<Awaited<ReturnType<typeof fs.stat>> | null> => {
  try {
    return await fs.stat(target);
  } catch {
    return null;
  }
};

const getConfig = (): ImagePipelineConfig => {
  const context = getHexoContext();
  const config = (context.config.image_pipeline ?? {}) as Partial<{
    enabled: boolean;
    format: OptimizedImageFormat;
    webp_quality: number;
    avif_quality: number;
    effort: number;
    passthrough: string[];
  }>;

  const format = config.format === "avif" ? "avif" : "webp";
  const fallbackQuality = format === "avif" ? 54 : 82;
  const configuredQuality = format === "avif" ? config.avif_quality : config.webp_quality;
  const normalizedPassthrough = Array.isArray(config.passthrough) ? config.passthrough : DEFAULT_PASSTHROUGH;

  return {
    enabled: config.enabled !== false,
    format,
    quality:
      typeof configuredQuality === "number" && Number.isFinite(configuredQuality)
        ? configuredQuality
        : fallbackQuality,
    effort: typeof config.effort === "number" && Number.isFinite(config.effort) ? config.effort : 4,
    passthrough: new Set(normalizedPassthrough.map((extension) => extension.toLowerCase())),
  };
};

const buildOutputPath = (absolutePath: string, format: OptimizedImageFormat): string => {
  const parsed = path.parse(absolutePath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
};

export const toSitePath = (absolutePath: string): string => {
  const context = getHexoContext();
  const relative = stripLeadingSlashes(path.relative(context.source_dir, absolutePath));
  return `/${normalizeSlashes(relative)}`;
};

export const toSourceAbsoluteFromSitePath = (sitePath: string): string | null => {
  if (!isSiteAbsolute(sitePath)) {
    return null;
  }

  const context = getHexoContext();
  return path.join(context.source_dir, stripLeadingSlashes(stripQueryAndHash(sitePath)));
};

export const optimizeImageAtPath = async (absolutePath: string): Promise<string> => {
  const config = getConfig();
  const extension = path.extname(absolutePath).toLowerCase();

  if (!config.enabled || config.passthrough.has(extension) || !CONVERTIBLE_EXTENSIONS.has(extension)) {
    return absolutePath;
  }

  const outputPath = buildOutputPath(absolutePath, config.format);
  const [sourceStats, outputStats] = await Promise.all([maybeStat(absolutePath), maybeStat(outputPath)]);

  if (!sourceStats || !sourceStats.isFile()) {
    return absolutePath;
  }

  if (outputStats && outputStats.mtimeMs >= sourceStats.mtimeMs && outputStats.size > 0) {
    return outputPath;
  }

  await ensureDir(path.dirname(outputPath));

  const pipeline = sharp(absolutePath, { failOn: "none" }).rotate();
  if (config.format === "avif") {
    await pipeline.avif({ quality: config.quality, effort: config.effort }).toFile(outputPath);
  } else {
    await pipeline.webp({ quality: config.quality, effort: Math.min(config.effort, 6) }).toFile(outputPath);
  }

  return outputPath;
};

export const optimizeSitePath = async (sitePath: string): Promise<string> => {
  const absolutePath = toSourceAbsoluteFromSitePath(sitePath);
  if (!absolutePath) {
    return sitePath;
  }

  const fileStats = await maybeStat(absolutePath);
  if (!fileStats?.isFile()) {
    return sitePath;
  }

  const optimizedPath = await optimizeImageAtPath(absolutePath);
  return toSitePath(optimizedPath);
};