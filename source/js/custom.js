"use strict";

(() => {
  if (window.__sdtvdpCustomUiReady) {
    return;
  }

  window.__sdtvdpCustomUiReady = true;

  const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const getSeedColor = (target) => {
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

  const buildHaloColor = (baseColor) => {
    const luminance = baseColor.r * 0.299 + baseColor.g * 0.587 + baseColor.b * 0.114;
    const shift = 12 + Math.floor(Math.random() * 14);
    const direction = luminance < 128 ? 1 : -1;
    const variance = () => direction * (shift + Math.floor(Math.random() * 7) - 3);

    return {
      r: clampChannel(baseColor.r + variance()),
      g: clampChannel(baseColor.g + variance()),
      b: clampChannel(baseColor.b + variance()),
    };
  };

  const spawnHalo = (event) => {
    if (prefersReducedMotion()) {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const seedColor = getSeedColor(event.target);
    const haloColor = buildHaloColor(seedColor);
    const halo = document.createElement("span");
    const size = 132 + Math.floor(Math.random() * 48);
    const driftX = Math.floor(Math.random() * 18) - 9;
    const driftY = Math.floor(Math.random() * 18) - 9;

    halo.className = "click-halo";
    halo.style.left = `${event.clientX}px`;
    halo.style.top = `${event.clientY}px`;
    halo.style.setProperty("--halo-size", `${size}px`);
    halo.style.setProperty("--halo-rgb", `${haloColor.r}, ${haloColor.g}, ${haloColor.b}`);
    halo.style.setProperty("--halo-x", `${driftX}px`);
    halo.style.setProperty("--halo-y", `${driftY}px`);

    document.body.appendChild(halo);
    halo.addEventListener("animationend", () => halo.remove(), { once: true });
  };

  document.addEventListener("pointerdown", spawnHalo, true);
})();
