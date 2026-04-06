"use strict";
(() => {
    const runtimeWindow = window;
    if (runtimeWindow.__sdtvdpCustomUiReady) {
        return;
    }
    runtimeWindow.__sdtvdpCustomUiReady = true;
    const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
    const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bitmapCache = new Map();
    const createSeededRandom = (seed) => {
        let state = seed >>> 0;
        return () => {
            state += 0x6d2b79f5;
            let next = Math.imul(state ^ (state >>> 15), 1 | state);
            next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
            return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
        };
    };
    const parseColor = (input) => {
        const value = String(input || "").trim();
        if (!value || value === "transparent") {
            return null;
        }
        const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (hexMatch) {
            const hex = hexMatch[1];
            const size = hex.length === 3 ? 1 : 2;
            const channels = [];
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
    const getFallbackSeedColor = (target) => {
        let current = target instanceof Element ? target : null;
        while (current) {
            const color = parseColor(window.getComputedStyle(current).backgroundColor);
            if (color && color.a > 0.08) {
                return color;
            }
            current = current.parentElement;
        }
        return (parseColor(window.getComputedStyle(document.documentElement).getPropertyValue("--global-bg")) ||
            parseColor(window.getComputedStyle(document.body).backgroundColor) ||
            { r: 23, g: 76, b: 128, a: 1 });
    };
    const toPositionPair = (input) => {
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
    const resolveAxisOffset = (token, remaining, axis) => {
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
    const resolveCssLength = (token, containerSize, intrinsicSize) => {
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
    const resolveDrawRect = ({ fit, position, boxWidth, boxHeight, mediaWidth, mediaHeight }) => {
        const normalizedFit = String(fit || "fill").trim().toLowerCase();
        let drawWidth = mediaWidth;
        let drawHeight = mediaHeight;
        if (normalizedFit === "fill") {
            drawWidth = boxWidth;
            drawHeight = boxHeight;
        }
        else if (normalizedFit === "contain" || normalizedFit === "cover") {
            const ratio = normalizedFit === "contain"
                ? Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight)
                : Math.max(boxWidth / mediaWidth, boxHeight / mediaHeight);
            drawWidth = mediaWidth * ratio;
            drawHeight = mediaHeight * ratio;
        }
        else if (normalizedFit === "none") {
            drawWidth = mediaWidth;
            drawHeight = mediaHeight;
        }
        else if (normalizedFit === "scale-down") {
            const ratio = Math.min(1, Math.min(boxWidth / mediaWidth, boxHeight / mediaHeight));
            drawWidth = mediaWidth * ratio;
            drawHeight = mediaHeight * ratio;
        }
        else {
            const sizeParts = normalizedFit.split(/\s+/).filter(Boolean);
            const widthToken = sizeParts[0] || "auto";
            const heightToken = sizeParts[1] || "auto";
            const resolvedWidth = resolveCssLength(widthToken, boxWidth, mediaWidth);
            const resolvedHeight = resolveCssLength(heightToken, boxHeight, mediaHeight);
            if (resolvedWidth === null && resolvedHeight === null) {
                drawWidth = mediaWidth;
                drawHeight = mediaHeight;
            }
            else if (resolvedWidth === null) {
                drawHeight = resolvedHeight;
                drawWidth = drawHeight * (mediaWidth / mediaHeight);
            }
            else if (resolvedHeight === null) {
                drawWidth = resolvedWidth;
                drawHeight = drawWidth * (mediaHeight / mediaWidth);
            }
            else {
                drawWidth = resolvedWidth;
                drawHeight = resolvedHeight;
            }
        }
        const [xToken, yToken] = toPositionPair(position);
        const offsetX = resolveAxisOffset(xToken, boxWidth - drawWidth, "x");
        const offsetY = resolveAxisOffset(yToken, boxHeight - drawHeight, "y");
        return { drawWidth, drawHeight, offsetX, offsetY };
    };
    const getCanvasContextFromElement = (imageElement) => {
        const source = imageElement.currentSrc || imageElement.src;
        const key = `img:${source}`;
        if (!source) {
            return Promise.resolve(null);
        }
        if (bitmapCache.has(key)) {
            return bitmapCache.get(key);
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
    const getCanvasContextFromSource = (source) => {
        const key = `url:${source}`;
        if (!source) {
            return Promise.resolve(null);
        }
        if (bitmapCache.has(key)) {
            return bitmapCache.get(key);
        }
        const task = new Promise((resolve) => {
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
                }
                catch {
                    resolve(null);
                }
            };
            image.onerror = () => resolve(null);
            image.src = source;
        });
        bitmapCache.set(key, task);
        return task;
    };
    const readPixel = (bitmap, x, y) => {
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
        }
        catch {
            return null;
        }
    };
    const parseBackgroundImageUrl = (value) => {
        const matches = [...String(value || "").matchAll(/url\((['"]?)(.*?)\1\)/gi)];
        return matches.length ? matches[matches.length - 1][2] : "";
    };
    const sampleImageElementColor = async (element, event) => {
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
        if (localX < fitRect.offsetX ||
            localX > fitRect.offsetX + fitRect.drawWidth ||
            localY < fitRect.offsetY ||
            localY > fitRect.offsetY + fitRect.drawHeight) {
            return null;
        }
        const imageX = ((localX - fitRect.offsetX) / fitRect.drawWidth) * bitmap.width;
        const imageY = ((localY - fitRect.offsetY) / fitRect.drawHeight) * bitmap.height;
        return readPixel(bitmap, imageX, imageY);
    };
    const sampleBackgroundImageColor = async (element, event) => {
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
        if (localX < fitRect.offsetX ||
            localX > fitRect.offsetX + fitRect.drawWidth ||
            localY < fitRect.offsetY ||
            localY > fitRect.offsetY + fitRect.drawHeight) {
            return null;
        }
        const imageX = ((localX - fitRect.offsetX) / fitRect.drawWidth) * bitmap.width;
        const imageY = ((localY - fitRect.offsetY) / fitRect.drawHeight) * bitmap.height;
        return readPixel(bitmap, imageX, imageY);
    };
    const getSeedColor = async (event) => {
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
        return getFallbackSeedColor(event.target);
    };
    const nudgeColor = (baseColor, random, minSpread = 6, spreadRange = 6) => {
        const spread = minSpread + Math.floor(random() * Math.max(1, spreadRange));
        const jitter = () => Math.floor(random() * (spread * 2 + 1)) - spread;
        return {
            r: clampChannel(baseColor.r + jitter()),
            g: clampChannel(baseColor.g + jitter()),
            b: clampChannel(baseColor.b + jitter()),
        };
    };
    const spawnBurst = async (event) => {
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
            const endColor = nudgeColor(seedColor, random, 10, 10);
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
    document.addEventListener("pointerdown", (event) => {
        void spawnBurst(event);
    }, true);
})();
