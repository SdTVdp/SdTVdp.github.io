"use strict";

(() => {
  if (window.__sdtvdpCustomUiReady) {
    return;
  }

  window.__sdtvdpCustomUiReady = true;

  const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  const nudgeColor = (baseColor, random) => {
    const jitter = () => Math.floor(random() * 31) - 15;

    return {
      r: clampChannel(baseColor.r + jitter()),
      g: clampChannel(baseColor.g + jitter()),
      b: clampChannel(baseColor.b + jitter()),
    };
  };

  const spawnBurst = (event) => {
    if (prefersReducedMotion()) {
      return;
    }

    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const startedAt = Date.now() >>> 0;
    const random = createSeededRandom(startedAt);
    const seedColor = getSeedColor(event.target);
    const particleCount = 3 + Math.floor(random() * 8);
    const burst = document.createElement("span");

    burst.className = "click-burst";
    burst.style.left = `${event.clientX}px`;
    burst.style.top = `${event.clientY}px`;

    let maxDuration = 0;

    for (let index = 0; index < particleCount; index += 1) {
      const particle = document.createElement("span");
      const angle = random() * Math.PI * 2;
      const distance = 34 + random() * 78;
      const driftX = Math.cos(angle) * distance;
      const driftY = Math.sin(angle) * distance;
      const size = 8 + random() * 10;
      const duration = 520 + random() * 360;
      const delay = random() * 60;
      const color = nudgeColor(seedColor, random);

      particle.className = "click-burst-particle";
      particle.style.setProperty("--particle-size", `${size}px`);
      particle.style.setProperty("--particle-rgb", `${color.r}, ${color.g}, ${color.b}`);
      particle.style.setProperty("--particle-x", `${driftX.toFixed(2)}px`);
      particle.style.setProperty("--particle-y", `${driftY.toFixed(2)}px`);
      particle.style.setProperty("--particle-duration", `${duration.toFixed(0)}ms`);
      particle.style.setProperty("--particle-delay", `${delay.toFixed(0)}ms`);

      burst.appendChild(particle);
      maxDuration = Math.max(maxDuration, duration + delay);
    }

    document.body.appendChild(burst);
    window.setTimeout(() => burst.remove(), Math.ceil(maxDuration) + 120);
  };

  document.addEventListener("pointerdown", spawnBurst, true);
})();