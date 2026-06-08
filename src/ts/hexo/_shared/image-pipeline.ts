import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type OptimizedImageFormat = "webp" | "avif";

export interface ResponsiveImageMetadata {
  src: string;
  srcset?: string;
  sizes?: string;
  lqip?: string;
  width?: number;
  height?: number;
}

interface ImagePipelineConfig {
  enabled: boolean;
  format: OptimizedImageFormat;
  quality: number;
  effort: number;
  passthrough: Set<string>;
  responsiveWidths: number[];
  sizes: string;
  lqip: boolean;
}

const CONVERTIBLE_EXTENSIONS = new Set([".bmp", ".jpeg", ".jpg", ".png", ".tif", ".tiff"]);
const RESPONSIVE_SOURCE_EXTENSIONS = new Set([...CONVERTIBLE_EXTENSIONS, ".avif", ".webp"]);
const DEFAULT_PASSTHROUGH = [".apng", ".avif", ".gif", ".svg", ".webp"];
const DEFAULT_RESPONSIVE_WIDTHS = [480, 768, 1200, 1600];

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

const normalizeResponsiveWidths = (widths: unknown): number[] => {
  const configured = Array.isArray(widths) ? widths : DEFAULT_RESPONSIVE_WIDTHS;
  const normalized = configured
    .map((width) => Number(width))
    .filter((width) => Number.isInteger(width) && width >= 160 && width <= 3200);

  return Array.from(new Set(normalized)).sort((left, right) => left - right);
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
    responsive_widths: number[];
    sizes: string;
    lqip: boolean;
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
    responsiveWidths: normalizeResponsiveWidths(config.responsive_widths),
    sizes:
      typeof config.sizes === "string" && config.sizes.trim()
        ? config.sizes.trim()
        : "(max-width: 768px) 100vw, 768px",
    lqip: config.lqip !== false,
  };
};

const buildOutputPath = (absolutePath: string, format: OptimizedImageFormat): string => {
  const parsed = path.parse(absolutePath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
};

const buildResponsiveOutputPath = (absolutePath: string, width: number, format: OptimizedImageFormat): string => {
  const parsed = path.parse(absolutePath);
  return path.join(parsed.dir, `${parsed.name}-${width}.${format}`);
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

const writeResponsiveVariant = async (
  sourcePath: string,
  outputPath: string,
  width: number,
  config: ImagePipelineConfig
): Promise<string> => {
  const [sourceStats, outputStats] = await Promise.all([maybeStat(sourcePath), maybeStat(outputPath)]);

  if (!sourceStats?.isFile()) {
    return sourcePath;
  }

  if (outputStats && outputStats.mtimeMs >= sourceStats.mtimeMs && outputStats.size > 0) {
    return outputPath;
  }

  await ensureDir(path.dirname(outputPath));

  const pipeline = sharp(sourcePath, { failOn: "none" }).rotate().resize({
    width,
    withoutEnlargement: true,
  });

  if (config.format === "avif") {
    await pipeline.avif({ quality: config.quality, effort: config.effort }).toFile(outputPath);
  } else {
    await pipeline.webp({ quality: config.quality, effort: Math.min(config.effort, 6) }).toFile(outputPath);
  }

  return outputPath;
};

const buildLqip = async (absolutePath: string): Promise<string | undefined> => {
  try {
    const buffer = await sharp(absolutePath, { failOn: "none" })
      .rotate()
      .resize({ width: 32, withoutEnlargement: true })
      .webp({ quality: 32, effort: 2 })
      .toBuffer();

    return `data:image/webp;base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
};

export const buildResponsiveImageMetadata = async (absolutePath: string): Promise<ResponsiveImageMetadata> => {
  const config = getConfig();
  const optimizedPath = await optimizeImageAtPath(absolutePath);
  const result: ResponsiveImageMetadata = {
    src: toSitePath(optimizedPath),
  };

  const extension = path.extname(absolutePath).toLowerCase();
  if (!config.enabled || !RESPONSIVE_SOURCE_EXTENSIONS.has(extension)) {
    return result;
  }

  const imageMetadata = await sharp(absolutePath, { failOn: "none" })
    .metadata()
    .catch(() => null);

  const sourceWidth = imageMetadata?.width;
  if (!sourceWidth) {
    return result;
  }

  result.width = sourceWidth;
  if (imageMetadata?.height) {
    result.height = imageMetadata.height;
  }

  const variantWidths = config.responsiveWidths.filter((width) => width < sourceWidth);
  const variantPaths = await Promise.all(
    variantWidths.map(async (width) => ({
      width,
      path: await writeResponsiveVariant(
        absolutePath,
        buildResponsiveOutputPath(optimizedPath, width, config.format),
        width,
        config
      ),
    }))
  );

  const srcset = [
    ...variantPaths.map((variant) => `${toSitePath(variant.path)} ${variant.width}w`),
    `${toSitePath(optimizedPath)} ${sourceWidth}w`,
  ];

  if (srcset.length > 1) {
    result.srcset = srcset.join(", ");
    result.sizes = config.sizes;
  }

  if (config.lqip) {
    result.lqip = await buildLqip(absolutePath);
  }

  return result;
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
