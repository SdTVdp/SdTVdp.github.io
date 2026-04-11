interface CustomWindow extends Window {
  __sdtvdpCustomUiReady?: boolean;
}

interface SampledColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface BitmapSample {
  context: CanvasRenderingContext2D;
  width: number;
  height: number;
}

interface DrawRectInput {
  fit: string;
  position: string;
  boxWidth: number;
  boxHeight: number;
  mediaWidth: number;
  mediaHeight: number;
}

interface DrawRectResult {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

interface AmbientMeteor {
  x: number;
  y: number;
  angle: number;
  speed: number;
  speedPulse: number;
  speedPhase: number;
  length: number;
  width: number;
  opacity: number;
  tint: SampledColor;
  age: number;
  duration: number;
}

interface AmbientSunbeam {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  driftX: number;
  driftY: number;
  opacity: number;
  age: number;
  duration: number;
}

interface AmbientEffectLayerState {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  meteors: AmbientMeteor[];
  sunbeams: AmbientSunbeam[];
  frameId: number | null;
  lastTimestamp: number;
  nextSpawnAt: number;
  pixelRatio: number;
}

interface SiteBackdropLayerState {
  root: HTMLDivElement;
  image: HTMLDivElement;
  veil: HTMLDivElement;
}

(() => {
  const runtimeWindow = window as CustomWindow;

  if (runtimeWindow.__sdtvdpCustomUiReady) {
    return;
  }

  runtimeWindow.__sdtvdpCustomUiReady = true;

  const clampChannel = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
  const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const normalizeMailtoLinks = (root: ParentNode = document): void => {
    if (!("querySelectorAll" in root)) {
      return;
    }

    root.querySelectorAll<HTMLAnchorElement>('a[href^="mailto:"]').forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";

      if (!href) {
        return;
      }

      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");

      if (anchor.dataset.mailtoNormalized === "true") {
        return;
      }

      anchor.dataset.mailtoNormalized = "true";
      anchor.addEventListener("click", (event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }

        event.preventDefault();
        window.location.href = href;
      });
    });
  };
  const bitmapCache = new Map<string, Promise<BitmapSample | null>>();
  let themeObserverBound = false;
  let ambientEffectsBound = false;
  let ambientLayerState: AmbientEffectLayerState | null = null;
  let siteBackdropLayer: SiteBackdropLayerState | null = null;
  const siteBackdropProbeCache = new Map<string, Promise<string | null>>();

  const createSeededRandom = (seed: number): (() => number) => {
    let state = seed >>> 0;

    return () => {
      state += 0x6d2b79f5;
      let next = Math.imul(state ^ (state >>> 15), 1 | state);
      next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
      return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
  };

  const parseColor = (input: string | null | undefined): SampledColor | null => {
    const value = String(input || "").trim();

    if (!value || value === "transparent") {
      return null;
    }

    const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      const size = hex.length === 3 ? 1 : 2;
      const channels: number[] = [];

      for (let index = 0; index < 3; index += 1) {
        const chunk = hex.slice(index * size, index * size + size);
        channels.push(parseInt(size === 1 ? chunk + chunk : chunk, 16));
      }

      return { r: channels[0], g: channels[1], b: channels[2], a: 1 };
    }

    const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!rgbMatch) {
      return null;
    }

    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    if (parts.length < 3) {
      return null;
    }

    return {
      r: clampChannel(Number(parts[0])),
      g: clampChannel(Number(parts[1])),
      b: clampChannel(Number(parts[2])),
      a: parts[3] === undefined ? 1 : Math.max(0, Math.min(1, Number(parts[3]))),
    };
  };

  const getFallbackSeedColor = (target: EventTarget | null): SampledColor => {
    let current = target instanceof Element ? target : null;

    while (current) {
      const color = parseColor(window.getComputedStyle(current).backgroundColor);
      if (color && color.a > 0.08) {
        return color;
      }

      current = current.parentElement;
    }

    return (
      parseColor(window.getComputedStyle(document.documentElement).getPropertyValue("--global-bg")) ||
      parseColor(window.getComputedStyle(document.body).backgroundColor) ||
      { r: 23, g: 76, b: 128, a: 1 }
    );
  };

  const toPositionPair = (input: string): [string, string] => {
    const value = String(input || "50% 50%").trim();
    const parts = value.split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
      return ["50%", "50%"];
    }

    if (parts.length === 1) {
      if (/^(top|bottom)$/i.test(parts[0])) {
        return ["50%", parts[0]];
      }

      return [parts[0], "50%"];
    }

    return [parts[0], parts[1]];
  };

  const resolveAxisOffset = (token: string, remaining: number, axis: "x" | "y"): number => {
    const normalized = String(token || "50%").trim().toLowerCase();

    if (normalized === "center") {
      return remaining * 0.5;
    }

    if ((axis === "x" && normalized === "left") || (axis === "y" && normalized === "top")) {
      return 0;
    }

    if ((axis === "x" && normalized === "right") || (axis === "y" && normalized === "bottom")) {
      return remaining;
    }

    if (normalized.endsWith("%")) {
      return remaining * (Number.parseFloat(normalized) / 100);
    }

    const numeric = Number.parseFloat(normalized);
    return Number.isFinite(numeric) ? numeric : remaining * 0.5;
  };

  const resolveCssLength = (token: string, containerSize: number, intrinsicSize: number): number | null => {
    const normalized = String(token || "auto").trim().toLowerCase();

    if (normalized === "auto") {
      return null;
    }

    if (normalized.endsWith("%")) {
      return containerSize * (Number.parseFloat(normalized) / 100);
    }

    const numeric = Number.parseFloat(normalized);
    if (Number.isFinite(numeric)) {
      return numeric;
    }

    return intrinsicSize;
  };

  const resolveDrawRect = ({ fit, position, boxWidth, boxHeight, mediaWidth, mediaHeight }: DrawRectInput): DrawRectResult => {
    const normalizedFit = String(fit || "fill").trim().toLowerCase();
    let drawWidth = mediaWidth;
    let drawHeight = mediaHeight;

    if (normalizedFit === "fill") {
      drawWidth = boxWidth;
      drawHeight = boxHeight;
    } else if (normalizedFit === "contain" || normalizedFit === "cover") {
      const ratio = normalizedFit === "contain"
        ? Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight)
        : Math.max(boxWidth / mediaWidth, boxHeight / mediaHeight);
      drawWidth = mediaWidth * ratio;
      drawHeight = mediaHeight * ratio;
    } else if (normalizedFit === "none") {
      drawWidth = mediaWidth;
      drawHeight = mediaHeight;
    } else if (normalizedFit === "scale-down") {
      const ratio = Math.min(1, Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight));
      drawWidth = mediaWidth * ratio;
      drawHeight = mediaHeight * ratio;
    } else {
      const sizeParts = normalizedFit.split(/\s+/).filter(Boolean);
      const widthToken = sizeParts[0] || "auto";
      const heightToken = sizeParts[1] || "auto";
      const resolvedWidth = resolveCssLength(widthToken, boxWidth, mediaWidth);
      const resolvedHeight = resolveCssLength(heightToken, boxHeight, mediaHeight);

      if (resolvedWidth === null && resolvedHeight === null) {
        drawWidth = mediaWidth;
        drawHeight = mediaHeight;
      } else if (resolvedWidth === null) {
        drawHeight = resolvedHeight!;
        drawWidth = drawHeight * (mediaWidth / mediaHeight);
      } else if (resolvedHeight === null) {
        drawWidth = resolvedWidth!;
        drawHeight = drawWidth * (mediaHeight / mediaWidth);
      } else {
        drawWidth = resolvedWidth!;
        drawHeight = resolvedHeight!;
      }
    }

    const [xToken, yToken] = toPositionPair(position);
    const offsetX = resolveAxisOffset(xToken, boxWidth - drawWidth, "x");
    const offsetY = resolveAxisOffset(yToken, boxHeight - drawHeight, "y");

    return { drawWidth, drawHeight, offsetX, offsetY };
  };

  const getCanvasContextFromElement = (imageElement: HTMLImageElement): Promise<BitmapSample | null> => {
    const source = imageElement.currentSrc || imageElement.src;
    const key = `img:${source}`;

    if (!source) {
      return Promise.resolve(null);
    }

    if (bitmapCache.has(key)) {
      return bitmapCache.get(key)!;
    }

    const task = Promise.resolve()
      .then(() => {
        const width = imageElement.naturalWidth || imageElement.width;
        const height = imageElement.naturalHeight || imageElement.height;

        if (!width || !height) {
          return null;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) {
          return null;
        }

        context.drawImage(imageElement, 0, 0, width, height);
        return { context, width, height };
      })
      .catch(() => null);

    bitmapCache.set(key, task);
    return task;
  };

  const getCanvasContextFromSource = (source: string): Promise<BitmapSample | null> => {
    const key = `url:${source}`;

    if (!source) {
      return Promise.resolve(null);
    }

    if (bitmapCache.has(key)) {
      return bitmapCache.get(key)!;
    }

    const task = new Promise<BitmapSample | null>((resolve) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;
          const context = canvas.getContext("2d", { willReadFrequently: true });

          if (!context || !canvas.width || !canvas.height) {
            resolve(null);
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve({ context, width: canvas.width, height: canvas.height });
        } catch {
          resolve(null);
        }
      };

      image.onerror = () => resolve(null);
      image.src = source;
    });

    bitmapCache.set(key, task);
    return task;
  };

  const readPixel = (bitmap: BitmapSample | null, x: number, y: number): SampledColor | null => {
    if (!bitmap || !bitmap.context || !bitmap.width || !bitmap.height) {
      return null;
    }

    const pixelX = Math.max(0, Math.min(bitmap.width - 1, Math.round(x)));
    const pixelY = Math.max(0, Math.min(bitmap.height - 1, Math.round(y)));

    try {
      const data = bitmap.context.getImageData(pixelX, pixelY, 1, 1).data;
      return {
        r: data[0],
        g: data[1],
        b: data[2],
        a: data[3] / 255,
      };
    } catch {
      return null;
    }
  };

  const parseBackgroundImageUrl = (value: string): string => {
    const matches = [...String(value || "").matchAll(/url\((['"]?)(.*?)\1\)/gi)];
    return matches.length ? matches[matches.length - 1][2] : "";
  };

  const sampleImageElementColor = async (element: Element, event: PointerEvent): Promise<SampledColor | null> => {
    if (!(element instanceof HTMLImageElement) || !element.complete) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    const bitmap = await getCanvasContextFromElement(element);

    if (!bitmap || !rect.width || !rect.height) {
      return null;
    }

    const style = window.getComputedStyle(element);
    const fitRect = resolveDrawRect({
      fit: style.objectFit || "fill",
      position: style.objectPosition || "50% 50%",
      boxWidth: rect.width,
      boxHeight: rect.height,
      mediaWidth: bitmap.width,
      mediaHeight: bitmap.height,
    });

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    if (
      localX < fitRect.offsetX ||
      localX > fitRect.offsetX + fitRect.drawWidth ||
      localY < fitRect.offsetY ||
      localY > fitRect.offsetY + fitRect.drawHeight
    ) {
      return null;
    }

    const imageX = ((localX - fitRect.offsetX) / fitRect.drawWidth) * bitmap.width;
    const imageY = ((localY - fitRect.offsetY) / fitRect.drawHeight) * bitmap.height;
    return readPixel(bitmap, imageX, imageY);
  };

  const sampleBackgroundImageColor = async (element: Element, event: PointerEvent): Promise<SampledColor | null> => {
    const style = window.getComputedStyle(element);
    const backgroundSource = parseBackgroundImageUrl(style.backgroundImage);

    if (!backgroundSource) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const bitmap = await getCanvasContextFromSource(backgroundSource);
    if (!bitmap) {
      return null;
    }

    const fitRect = resolveDrawRect({
      fit: style.backgroundSize || "auto",
      position: style.backgroundPosition || "50% 50%",
      boxWidth: rect.width,
      boxHeight: rect.height,
      mediaWidth: bitmap.width,
      mediaHeight: bitmap.height,
    });

    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;

    if (
      localX < fitRect.offsetX ||
      localX > fitRect.offsetX + fitRect.drawWidth ||
      localY < fitRect.offsetY ||
      localY > fitRect.offsetY + fitRect.drawHeight
    ) {
      return null;
    }

    const imageX = ((localX - fitRect.offsetX) / fitRect.drawWidth) * bitmap.width;
    const imageY = ((localY - fitRect.offsetY) / fitRect.drawHeight) * bitmap.height;
    return readPixel(bitmap, imageX, imageY);
  };

  const blendSeedSample = (foreground: SampledColor, background: SampledColor): SampledColor => {
    const alpha = Math.max(0, Math.min(1, foreground.a));
    const inverseAlpha = 1 - alpha;

    return {
      r: clampChannel(foreground.r * alpha + background.r * inverseAlpha),
      g: clampChannel(foreground.g * alpha + background.g * inverseAlpha),
      b: clampChannel(foreground.b * alpha + background.b * inverseAlpha),
      a: 1,
    };
  };

  const interpolateSampledColor = (from: SampledColor, to: SampledColor, ratio: number): SampledColor => {
    const amount = Math.max(0, Math.min(1, ratio));
    const inverse = 1 - amount;

    return {
      r: clampChannel(from.r * inverse + to.r * amount),
      g: clampChannel(from.g * inverse + to.g * amount),
      b: clampChannel(from.b * inverse + to.b * amount),
      a: Math.max(0, Math.min(1, from.a * inverse + to.a * amount)),
    };
  };

  const sampleSiteBackdropVisibleColor = async (event: PointerEvent): Promise<SampledColor | null> => {
    if (!siteBackdropLayer || siteBackdropLayer.root.hidden) {
      return null;
    }

    const imageColor = await sampleBackgroundImageColor(siteBackdropLayer.image, event);
    if (!imageColor || imageColor.a <= 0.01) {
      return null;
    }

    const rootStyle = window.getComputedStyle(siteBackdropLayer.root);
    const imageStyle = window.getComputedStyle(siteBackdropLayer.image);
    const rootColor =
      parseColor(rootStyle.backgroundColor) ||
      parseColor(window.getComputedStyle(document.documentElement).getPropertyValue("--global-bg")) ||
      { r: 23, g: 76, b: 128, a: 1 };
    const imageOpacity = Math.max(0, Math.min(1, Number.parseFloat(imageStyle.opacity || "1") || 1));
    const resolvedImage =
      imageOpacity >= 0.999
        ? { r: imageColor.r, g: imageColor.g, b: imageColor.b, a: 1 }
        : blendSeedSample({ ...imageColor, a: imageColor.a * imageOpacity }, rootColor);

    const overlayStart = parseColor(rootStyle.getPropertyValue("--site-background-overlay-start"));
    const overlayEnd = parseColor(rootStyle.getPropertyValue("--site-background-overlay-end"));

    if (!overlayStart && !overlayEnd) {
      return resolvedImage;
    }

    const viewportHeight = Math.max(window.innerHeight, 1);
    const verticalRatio = Math.max(0, Math.min(1, event.clientY / viewportHeight));
    const overlay = overlayStart && overlayEnd
      ? interpolateSampledColor(overlayStart, overlayEnd, verticalRatio)
      : (overlayStart || overlayEnd)!;

    return blendSeedSample(overlay, resolvedImage);
  };

  const getSeedColor = async (event: PointerEvent): Promise<SampledColor> => {
    let current = event.target instanceof Element ? event.target : null;

    while (current) {
      const imageColor = await sampleImageElementColor(current, event);
      if (imageColor && imageColor.a > 0.18) {
        return imageColor;
      }

      const backgroundImageColor = await sampleBackgroundImageColor(current, event);
      if (backgroundImageColor && backgroundImageColor.a > 0.18) {
        return backgroundImageColor;
      }

      current = current.parentElement;
    }

    const backdropColor = await sampleSiteBackdropVisibleColor(event);
    if (backdropColor && backdropColor.a > 0.18) {
      return backdropColor;
    }

    return getFallbackSeedColor(event.target);
  };

  const nudgeColor = (
    baseColor: SampledColor,
    random: () => number,
    minSpread = 6,
    spreadRange = 6
  ): Omit<SampledColor, "a"> => {
    const spread = minSpread + Math.floor(random() * Math.max(1, spreadRange));
    const jitter = (): number => Math.floor(random() * (spread * 2 + 1)) - spread;

    return {
      r: clampChannel(baseColor.r + jitter()),
      g: clampChannel(baseColor.g + jitter()),
      b: clampChannel(baseColor.b + jitter()),
    };
  };

  const spawnBurst = async (event: PointerEvent): Promise<void> => {
    if (prefersReducedMotion()) {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const startedAt = Date.now() >>> 0;
    const random = createSeededRandom(startedAt);
    const seedColor = await getSeedColor(event);
    const particleCount = 3 + Math.floor(random() * 8);
    const lineCount = 3 + Math.floor(random() * 4);
    const burst = document.createElement("span");

    burst.className = "click-burst";
    burst.style.left = `${event.clientX}px`;
    burst.style.top = `${event.clientY}px`;

    let maxDuration = 0;

    for (let index = 0; index < lineCount; index += 1) {
      const line = document.createElement("span");
      const angle = random() * Math.PI * 2;
      const length = 56 + random() * 108;
      const width = 2 + random() * 2.6;
      const duration = 520 + random() * 280;
      const delay = random() * 40;
      const midStop = 42 + random() * 16;
      const endColor = nudgeColor(seedColor, random, 18, 20);

      line.className = "click-burst-line";
      line.style.setProperty("--line-angle", `${angle}rad`);
      line.style.setProperty("--line-length", `${length.toFixed(2)}px`);
      line.style.setProperty("--line-width", `${width.toFixed(2)}px`);
      line.style.setProperty("--line-duration", `${duration.toFixed(0)}ms`);
      line.style.setProperty("--line-delay", `${delay.toFixed(0)}ms`);
      line.style.setProperty("--line-mid-stop", `${midStop.toFixed(2)}%`);
      line.style.setProperty("--line-start-rgb", `${seedColor.r}, ${seedColor.g}, ${seedColor.b}`);
      line.style.setProperty("--line-end-rgb", `${endColor.r}, ${endColor.g}, ${endColor.b}`);

      burst.appendChild(line);
      maxDuration = Math.max(maxDuration, duration + delay);
    }

    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("span");
      const angle = random() * Math.PI * 2;
      const distance = 44 + random() * 104;
      const driftX = Math.cos(angle) * distance;
      const driftY = Math.sin(angle) * distance;
      const size = 12 + random() * 33;
      const duration = 560 + random() * 420;
      const delay = random() * 70;
      const color = nudgeColor(seedColor, random, 6, 6);

      particle.className = "click-burst-particle";
      particle.style.setProperty("--particle-size", `${size.toFixed(2)}px`);
      particle.style.setProperty("--particle-rgb", `${color.r}, ${color.g}, ${color.b}`);
      particle.style.setProperty("--particle-x", `${driftX.toFixed(2)}px`);
      particle.style.setProperty("--particle-y", `${driftY.toFixed(2)}px`);
      particle.style.setProperty("--particle-duration", `${duration.toFixed(0)}ms`);
      particle.style.setProperty("--particle-delay", `${delay.toFixed(0)}ms`);

      burst.appendChild(particle);
      maxDuration = Math.max(maxDuration, duration + delay);
    }

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), Math.ceil(maxDuration) + 140);
  };

  const blendColor = (foreground: SampledColor, background: SampledColor): SampledColor => {
    const alpha = Math.max(0, Math.min(1, foreground.a));
    const inverseAlpha = 1 - alpha;

    return {
      r: clampChannel(foreground.r * alpha + background.r * inverseAlpha),
      g: clampChannel(foreground.g * alpha + background.g * inverseAlpha),
      b: clampChannel(foreground.b * alpha + background.b * inverseAlpha),
      a: 1,
    };
  };

  const invertColor = (color: SampledColor): SampledColor => ({
    r: 255 - color.r,
    g: 255 - color.g,
    b: 255 - color.b,
    a: 1,
  });

  const mixColor = (from: SampledColor, to: SampledColor, amount: number): SampledColor => {
    const ratio = Math.max(0, Math.min(1, amount));
    const inverseRatio = 1 - ratio;

    return {
      r: clampChannel(from.r * inverseRatio + to.r * ratio),
      g: clampChannel(from.g * inverseRatio + to.g * ratio),
      b: clampChannel(from.b * inverseRatio + to.b * ratio),
      a: 1,
    };
  };

  const getRelativeLuminance = (color: SampledColor): number => {
    const toLinear = (channel: number): number => {
      const normalized = channel / 255;
      return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * toLinear(color.r) + 0.7152 * toLinear(color.g) + 0.0722 * toLinear(color.b);
  };

  const getContrastRatio = (foreground: SampledColor, background: SampledColor): number => {
    const resolvedForeground = foreground.a >= 0.999 ? foreground : blendColor(foreground, background);
    const lighter = Math.max(getRelativeLuminance(resolvedForeground), getRelativeLuminance(background));
    const darker = Math.min(getRelativeLuminance(resolvedForeground), getRelativeLuminance(background));
    return (lighter + 0.05) / (darker + 0.05);
  };

  const getColorDistance = (left: SampledColor, right: SampledColor): number =>
    Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);

  const getThemeBackdropColor = (): SampledColor =>
    parseColor(window.getComputedStyle(document.documentElement).getPropertyValue("--global-bg")) ||
    parseColor(window.getComputedStyle(document.body).backgroundColor) ||
    { r: 31, g: 30, b: 51, a: 1 };

  const getEffectiveBackgroundColor = (element: Element): SampledColor => {
    const layers: SampledColor[] = [];
    let current: Element | null = element;

    while (current) {
      const background = parseColor(window.getComputedStyle(current).backgroundColor);
      if (background && background.a > 0.01) {
        layers.unshift(background);
      }

      current = current.parentElement;
    }

    return layers.reduce<SampledColor>((resolved, layer) => {
      if (layer.a >= 0.999) {
        return { r: layer.r, g: layer.g, b: layer.b, a: 1 };
      }

      return blendColor(layer, resolved);
    }, getThemeBackdropColor());
  };

  const chooseReadableColor = (foreground: SampledColor, background: SampledColor): SampledColor => {
    const resolvedForeground = foreground.a >= 0.999 ? { ...foreground, a: 1 } : blendColor(foreground, background);
    const backdropInverse = invertColor(background);
    const neutralTarget = getRelativeLuminance(background) < 0.35
      ? ({ r: 245, g: 247, b: 255, a: 1 } as SampledColor)
      : ({ r: 21, g: 36, b: 58, a: 1 } as SampledColor);
    const threshold = 4.8;
    const candidates = [
      resolvedForeground,
      mixColor(resolvedForeground, neutralTarget, 0.34),
      mixColor(resolvedForeground, neutralTarget, 0.52),
      mixColor(resolvedForeground, neutralTarget, 0.72),
      invertColor(resolvedForeground),
      mixColor(resolvedForeground, backdropInverse, 0.5),
      mixColor(resolvedForeground, backdropInverse, 0.72),
      backdropInverse,
    ];
    const ranked = candidates
      .filter((candidate, index, list) => list.findIndex((item) => item.r === candidate.r && item.g === candidate.g && item.b === candidate.b) === index)
      .map((candidate) => ({
        candidate,
        contrast: getContrastRatio(candidate, background),
        distance: getColorDistance(candidate, resolvedForeground),
      }));
    const passing = ranked
      .filter((entry) => entry.contrast >= threshold)
      .sort((left, right) => left.distance - right.distance || right.contrast - left.contrast);

    if (passing.length > 0) {
      return passing[0].candidate;
    }

    ranked.sort((left, right) => right.contrast - left.contrast || left.distance - right.distance);
    return ranked[0]?.candidate || resolvedForeground;
  };

  const isDarkTheme = (): boolean =>
    document.documentElement.getAttribute("data-theme") === "dark" ||
    document.body.getAttribute("data-theme") === "dark";

  const getAdaptiveContrastTargets = (root: ParentNode = document): HTMLElement[] => {
    if (!("querySelectorAll" in root)) {
      return [];
    }

    const selector = [
      "#article-container :not(pre) > code",
      "#article-container mark",
      "#article-container kbd",
      "#article-container samp",
      "#article-container font[color]",
      "#article-container [style*=\"color\"]",
    ].join(", ");

    return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter((element, index, list) => {
      if (!element.textContent || !element.textContent.trim()) {
        return false;
      }

      return list.indexOf(element) === index;
    });
  };

  const rememberAdaptiveColorState = (element: HTMLElement): void => {
    if (element.dataset.sdtvdpColorCaptured === "true") {
      return;
    }

    element.dataset.sdtvdpColorCaptured = "true";
    element.dataset.sdtvdpOriginalColor = element.style.getPropertyValue("color");
    element.dataset.sdtvdpOriginalColorPriority = element.style.getPropertyPriority("color");
  };

  const restoreAdaptiveColorState = (element: HTMLElement): void => {
    if (element.dataset.sdtvdpColorCaptured !== "true") {
      return;
    }

    const originalColor = element.dataset.sdtvdpOriginalColor || "";
    const originalPriority = element.dataset.sdtvdpOriginalColorPriority || "";

    if (originalColor) {
      element.style.setProperty("color", originalColor, originalPriority);
    } else {
      element.style.removeProperty("color");
    }

    delete element.dataset.sdtvdpAdaptiveContrast;
  };

  const adaptInlineTextContrast = (root: ParentNode = document): void => {
    const targets = getAdaptiveContrastTargets(root);

    if (!isDarkTheme()) {
      targets.forEach((element) => restoreAdaptiveColorState(element));
      return;
    }

    targets.forEach((element) => {
      const computedStyle = window.getComputedStyle(element);

      if (computedStyle.display === "none" || computedStyle.visibility === "hidden") {
        return;
      }

      const foreground = parseColor(computedStyle.color);
      if (!foreground) {
        return;
      }

      const background = getEffectiveBackgroundColor(element);
      const currentContrast = getContrastRatio(foreground, background);

      if (currentContrast >= 4.8) {
        restoreAdaptiveColorState(element);
        return;
      }

      const adaptedColor = chooseReadableColor(foreground, background);
      rememberAdaptiveColorState(element);
      element.dataset.sdtvdpAdaptiveContrast = "true";
      element.style.setProperty("color", `rgb(${adaptedColor.r}, ${adaptedColor.g}, ${adaptedColor.b})`, "important");
    });
  };

  const observeThemeChanges = (): void => {
    if (themeObserverBound) {
      return;
    }

    themeObserverBound = true;
    const observer = new MutationObserver(() => {
      void ensureSiteBackdropLayer();
      window.requestAnimationFrame(() => adaptInlineTextContrast());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (document.body) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }
  };

  const easeOutCubic = (value: number): number => {
    const clamped = Math.max(0, Math.min(1, value));
    return 1 - (1 - clamped) ** 3;
  };

  const easeInOutSine = (value: number): number => {
    const clamped = Math.max(0, Math.min(1, value));
    return -(Math.cos(Math.PI * clamped) - 1) / 2;
  };

  const getAmbientCanvasSize = (): { width: number; height: number; pixelRatio: number } => {
    const pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    return {
      width: Math.max(window.innerWidth, 1),
      height: Math.max(window.innerHeight, 1),
      pixelRatio,
    };
  };

  const getAmbientSeededRandom = (salt = 0): (() => number) =>
    createSeededRandom((Date.now() ^ Math.floor(performance.now() * 1000) ^ Math.floor(window.scrollY) ^ salt) >>> 0);

  const getNormalizedPathname = (): string => {
    const pathname = window.location.pathname || "/";
    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  };

  const isBackdropSurfacePage = (): boolean => {
    const pathname = getNormalizedPathname();
    const exactMatches = new Set<string>(["/", "/about/"]);

    if (exactMatches.has(pathname)) {
      return true;
    }

    return ["/blog/", "/posts/", "/archives/", "/tags/", "/categories/"].some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix)
    );
  };

  const getSiteBackdropCandidates = (): string[] => {
    const suffix = isDarkTheme() ? "dark" : "light";

    return [
      `/uploads/backgrounds/blog-body-background-${suffix}.avif`,
      `/uploads/backgrounds/blog-body-background-${suffix}.webp`,
      `/uploads/backgrounds/blog-body-background-${suffix}.png`,
      `/uploads/backgrounds/blog-body-background-${suffix}.jpg`,
      `/uploads/backgrounds/blog-body-background-${suffix}.jpeg`,
      `/uploads/backgrounds/blog-body-background-${suffix}.gif`,
    ];
  };

  const probeImageExists = (source: string): Promise<boolean> =>
    new Promise((resolve) => {
      const image = new Image();
      const probeSource = `${source}${source.includes("?") ? "&" : "?"}v=${Date.now()}`;

      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.decoding = "async";
      image.src = probeSource;
    });

  const resolveSiteBackdropUrl = async (): Promise<string | null> => {
    const cacheKey = isDarkTheme() ? "dark" : "light";
    const cached = siteBackdropProbeCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const probe = (async () => {
      for (const candidate of getSiteBackdropCandidates()) {
        if (await probeImageExists(candidate)) {
          return candidate;
        }
      }

      return null;
    })();

    siteBackdropProbeCache.set(cacheKey, probe);
    return probe;
  };

  const resizeAmbientCanvas = (state: AmbientEffectLayerState): void => {
    const { width, height, pixelRatio } = getAmbientCanvasSize();
    state.pixelRatio = pixelRatio;

    if (state.canvas.width === Math.round(width * pixelRatio) && state.canvas.height === Math.round(height * pixelRatio)) {
      return;
    }

    state.canvas.width = Math.round(width * pixelRatio);
    state.canvas.height = Math.round(height * pixelRatio);
    state.canvas.style.width = `${width}px`;
    state.canvas.style.height = `${height}px`;
    state.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const removeAmbientLayer = (): void => {
    if (!ambientLayerState) {
      return;
    }

    if (ambientLayerState.frameId !== null) {
      window.cancelAnimationFrame(ambientLayerState.frameId);
    }

    ambientLayerState.canvas.remove();
    ambientLayerState = null;
  };

  const ensureSiteBackdropLayer = async (): Promise<void> => {
    if (!isBackdropSurfacePage()) {
      if (siteBackdropLayer) {
        siteBackdropLayer.root.hidden = true;
      }

      return;
    }

    if (!siteBackdropLayer) {
      const root = document.createElement("div");
      const image = document.createElement("div");
      const veil = document.createElement("div");

      root.className = "site-background-root";
      root.setAttribute("aria-hidden", "true");
      root.hidden = true;

      image.className = "site-background-image";
      veil.className = "site-background-veil";

      root.appendChild(image);
      root.appendChild(veil);
      document.body.prepend(root);

      siteBackdropLayer = { root, image, veil };
    }

    const resolved = await resolveSiteBackdropUrl();

    if (!siteBackdropLayer) {
      return;
    }

    if (!resolved) {
      siteBackdropLayer.root.hidden = true;
      siteBackdropLayer.image.style.removeProperty("--site-backdrop-image");
      return;
    }

    siteBackdropLayer.root.hidden = false;
    siteBackdropLayer.image.style.setProperty("--site-backdrop-image", `url("${resolved}")`);
  };

  const spawnAmbientMeteor = (state: AmbientEffectLayerState, now: number): void => {
    const random = getAmbientSeededRandom(Math.floor(now));
    const width = state.canvas.width / state.pixelRatio;
    const height = state.canvas.height / state.pixelRatio;
    const angle = Math.atan2(0.4, -1) + (random() - 0.5) * 0.12;
    const fromRightEdge = random() < 0.58;
    const tintPalette: SampledColor[] = [
      { r: 220, g: 236, b: 255, a: 1 },
      { r: 233, g: 224, b: 255, a: 1 },
      { r: 255, g: 232, b: 244, a: 1 },
      { r: 226, g: 248, b: 240, a: 1 },
    ];
    const tint = tintPalette[Math.floor(random() * tintPalette.length)] || tintPalette[0];

    const originX = fromRightEdge
      ? width + 120 + random() * 180
      : width * (0.52 + random() * 0.48);
    const originY = fromRightEdge
      ? height * (0.02 + random() * 0.46)
      : -120 - random() * 90;

    state.meteors.push({
      x: originX,
      y: originY,
      angle,
      speed: 0.96 + random() * 0.82,
      speedPulse: 0.14 + random() * 0.2,
      speedPhase: random() * Math.PI * 2,
      length: 260 + random() * 360,
      width: 2.4 + random() * 3.6,
      opacity: 0.28 + random() * 0.22,
      tint,
      age: 0,
      duration: 1080 + random() * 760,
    });
  };

  const spawnAmbientSunbeam = (state: AmbientEffectLayerState, now: number): void => {
    const random = getAmbientSeededRandom(Math.floor(now) ^ 0x9e3779b9);
    const width = state.canvas.width / state.pixelRatio;
    const height = state.canvas.height / state.pixelRatio;

    state.sunbeams.push({
      x: width * (0.1 + random() * 0.8),
      y: height * (0.08 + random() * 0.44),
      radiusX: 280 + random() * 420,
      radiusY: 200 + random() * 300,
      driftX: -36 + random() * 72,
      driftY: -20 + random() * 40,
      opacity: 0.05 + random() * 0.04,
      age: 0,
      duration: 3600 + random() * 3400,
    });
  };

  const scheduleAmbientSpawn = (state: AmbientEffectLayerState, now: number): void => {
    const random = getAmbientSeededRandom(Math.floor(now) ^ 0x85ebca6b);

    if (isDarkTheme()) {
      spawnAmbientMeteor(state, now);
      state.nextSpawnAt = now + 260 + random() * 380;
      return;
    }

    spawnAmbientSunbeam(state, now);
    state.nextSpawnAt = now + 700 + random() * 1260;
  };

  const drawAmbientMeteor = (
    context: CanvasRenderingContext2D,
    meteor: AmbientMeteor,
    width: number,
    height: number
  ): void => {
    const progress = meteor.age / meteor.duration;

    if (progress >= 1 || meteor.x - meteor.length > width + 80 || meteor.y < -80 || meteor.y > height + 80) {
      return;
    }

    const fade = Math.sin(progress * Math.PI);
    const tint = meteor.tint;

    context.save();
    context.translate(meteor.x, meteor.y);
    context.rotate(meteor.angle);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = meteor.opacity * (0.45 + easeOutCubic(Math.min(progress * 1.3, 1)) * 0.55) * fade;

    const trail = context.createLinearGradient(-meteor.length, 0, 0, 0);
    trail.addColorStop(0, "rgba(255, 255, 255, 0)");
    trail.addColorStop(0.26, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.05)`);
    trail.addColorStop(0.62, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.2)`);
    trail.addColorStop(0.82, `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.52)`);
    trail.addColorStop(0.94, "rgba(255, 255, 255, 0.82)");
    trail.addColorStop(1, "rgba(255, 255, 255, 0.95)");

    context.strokeStyle = trail;
    context.lineWidth = meteor.width;
    context.lineCap = "round";
    context.shadowColor = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.5)`;
    context.shadowBlur = 28;
    context.beginPath();
    context.moveTo(-meteor.length, 0);
    context.lineTo(0, 0);
    context.stroke();

    context.strokeStyle = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.16)`;
    context.lineWidth = meteor.width * 2.6;
    context.shadowColor = `rgba(${tint.r}, ${tint.g}, ${tint.b}, 0.26)`;
    context.shadowBlur = 42;
    context.beginPath();
    context.moveTo(-meteor.length * 0.86, 0);
    context.lineTo(-meteor.length * 0.08, 0);
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.95)";
    context.shadowColor = "rgba(255, 255, 255, 0.72)";
    context.shadowBlur = 34;
    context.beginPath();
    context.arc(0, 0, meteor.width * 1.9, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const drawAmbientSunbeam = (context: CanvasRenderingContext2D, sunbeam: AmbientSunbeam): void => {
    const progress = sunbeam.age / sunbeam.duration;

    if (progress >= 1) {
      return;
    }

    const fade = Math.sin(progress * Math.PI);
    const centerX = sunbeam.x + sunbeam.driftX * easeInOutSine(progress);
    const centerY = sunbeam.y + sunbeam.driftY * easeInOutSine(progress);

    context.save();
    context.translate(centerX, centerY);
    context.scale(1, sunbeam.radiusY / sunbeam.radiusX);
    context.globalCompositeOperation = "screen";
    context.globalAlpha = sunbeam.opacity * fade;

    const glow = context.createRadialGradient(0, 0, 0, 0, 0, sunbeam.radiusX);
    glow.addColorStop(0, "rgba(255, 248, 216, 0.36)");
    glow.addColorStop(0.24, "rgba(255, 247, 227, 0.18)");
    glow.addColorStop(0.58, "rgba(255, 255, 255, 0.08)");
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");

    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, sunbeam.radiusX, 0, Math.PI * 2);
    context.fill();

    const warmCore = context.createRadialGradient(0, 0, 0, 0, 0, sunbeam.radiusX * 0.56);
    warmCore.addColorStop(0, "rgba(255, 252, 233, 0.18)");
    warmCore.addColorStop(0.5, "rgba(255, 246, 214, 0.08)");
    warmCore.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = warmCore;
    context.beginPath();
    context.arc(0, 0, sunbeam.radiusX * 0.56, 0, Math.PI * 2);
    context.fill();
    context.restore();
  };

  const renderAmbientEffects = (state: AmbientEffectLayerState): void => {
    const width = state.canvas.width / state.pixelRatio;
    const height = state.canvas.height / state.pixelRatio;

    state.context.clearRect(0, 0, width, height);

    if (isDarkTheme()) {
      state.meteors.forEach((meteor) => drawAmbientMeteor(state.context, meteor, width, height));
      return;
    }

    state.sunbeams.forEach((sunbeam) => drawAmbientSunbeam(state.context, sunbeam));
  };

  const tickAmbientEffects = (timestamp: number): void => {
    if (!ambientLayerState) {
      return;
    }

    const state = ambientLayerState;
    const delta = state.lastTimestamp ? Math.min(timestamp - state.lastTimestamp, 48) : 16;
    state.lastTimestamp = timestamp;

    resizeAmbientCanvas(state);

    if (prefersReducedMotion()) {
      removeAmbientLayer();
      return;
    }

    if (document.hidden) {
      state.frameId = window.requestAnimationFrame(tickAmbientEffects);
      return;
    }

    if (isDarkTheme()) {
      state.sunbeams.length = 0;
    } else {
      state.meteors.length = 0;
    }

    while (timestamp >= state.nextSpawnAt) {
      scheduleAmbientSpawn(state, state.nextSpawnAt);
    }

    state.meteors = state.meteors
      .map((meteor) => {
        const nextAge = meteor.age + delta;
        const wave = 1 + Math.sin(meteor.speedPhase + nextAge * 0.012) * meteor.speedPulse;
        const currentSpeed = meteor.speed * wave;

        return {
          ...meteor,
          age: nextAge,
          x: meteor.x + Math.cos(meteor.angle) * currentSpeed * delta,
          y: meteor.y + Math.sin(meteor.angle) * currentSpeed * delta,
        };
      })
      .filter((meteor) => meteor.age < meteor.duration);

    state.sunbeams = state.sunbeams
      .map((sunbeam) => ({
        ...sunbeam,
        age: sunbeam.age + delta,
      }))
      .filter((sunbeam) => sunbeam.age < sunbeam.duration);

    renderAmbientEffects(state);
    state.frameId = window.requestAnimationFrame(tickAmbientEffects);
  };

  const ensureAmbientEffectsLayer = (): void => {
    if (prefersReducedMotion()) {
      removeAmbientLayer();
      return;
    }

    if (!ambientLayerState) {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

      canvas.className = "ambient-effects-layer";
      canvas.setAttribute("aria-hidden", "true");

      ambientLayerState = {
        canvas,
        context,
        meteors: [],
        sunbeams: [],
        frameId: null,
        lastTimestamp: 0,
        nextSpawnAt: performance.now() + 120,
        pixelRatio: 1,
      };
    }

    if (!document.body.contains(ambientLayerState.canvas)) {
      document.body.appendChild(ambientLayerState.canvas);
    }

    resizeAmbientCanvas(ambientLayerState);
    const now = performance.now();

    if (ambientLayerState.meteors.length === 0 && ambientLayerState.sunbeams.length === 0) {
      scheduleAmbientSpawn(ambientLayerState, now);
    }

    if (ambientLayerState.frameId === null) {
      ambientLayerState.lastTimestamp = now;
      ambientLayerState.frameId = window.requestAnimationFrame(tickAmbientEffects);
    }

    if (ambientEffectsBound) {
      return;
    }

    ambientEffectsBound = true;

    window.addEventListener("resize", () => {
      if (ambientLayerState) {
        resizeAmbientCanvas(ambientLayerState);
      }
    });

    document.addEventListener("visibilitychange", () => {
      if (!ambientLayerState) {
        return;
      }

      if (document.hidden) {
        ambientLayerState.context.clearRect(
          0,
          0,
          ambientLayerState.canvas.width / ambientLayerState.pixelRatio,
          ambientLayerState.canvas.height / ambientLayerState.pixelRatio
        );
      } else {
        ambientLayerState.lastTimestamp = performance.now();
      }
    });
  };

  const activateUiEnhancements = (): void => {
    normalizeMailtoLinks();
    observeThemeChanges();
    void ensureSiteBackdropLayer();
    ensureAmbientEffectsLayer();
    window.requestAnimationFrame(() => adaptInlineTextContrast());
  };

  activateUiEnhancements();
  document.addEventListener("DOMContentLoaded", activateUiEnhancements);
  document.addEventListener("pjax:complete", activateUiEnhancements);

  document.addEventListener(
    "pointerdown",
    (event) => {
      void spawnBurst(event as PointerEvent);
    },
    true
  );
})();





