"use strict";

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceVideo = path.join(root, "source", "uploads", "backgrounds", "background2.optimized.mp4");
const posterImage = path.join(root, "source", "uploads", "backgrounds", "background2-poster.jpg");
const siteEnhancements = path.join(root, "src", "ts", "hexo", "site-enhancements.ts");
const customCss = path.join(root, "source", "css", "custom.css");
const sourcePages = [
  path.join(root, "source", "index.html"),
  path.join(root, "source", "about", "index.md"),
];
const publicPages = [
  path.join(root, "public", "index.html"),
  path.join(root, "public", "about", "index.html"),
];
const publicOriginalVideo = path.join(root, "public", "uploads", "backgrounds", "background2.mp4");

const read = (file) => fs.readFileSync(file, "utf8");

assert.ok(fs.existsSync(sourceVideo), "optimized video should exist in source/uploads/backgrounds");
assert.ok(fs.existsSync(posterImage), "poster image should exist for the video fallback");

const videoSize = fs.statSync(sourceVideo).size;
assert.ok(videoSize > 0, "optimized video should not be empty");
assert.ok(videoSize < 15 * 1024 * 1024, "optimized video should stay below 15 MiB for the first paint");

const audioStreams = execFileSync(
  "ffprobe",
  ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", sourceVideo],
  { encoding: "utf8" }
).trim();
assert.equal(audioStreams, "", "optimized video should not contain audio streams");

const enhancementSource = read(siteEnhancements);
assert.match(enhancementSource, /withVideoTopImages/, "site enhancement filter should inject video top images");
assert.match(enhancementSource, /page-header-video/, "site enhancement filter should render a video element");

const css = read(customCss);
assert.match(css, /page-header-video/, "custom CSS should style the header video layer");

for (const pagePath of sourcePages) {
  const content = read(pagePath);
  assert.match(content, /top_img:\s*\/uploads\/backgrounds\/background2-poster\.jpg/, `${pagePath} should use the poster top_img`);
  assert.match(content, /top_video:\s*\/uploads\/backgrounds\/background2\.optimized\.mp4/, `${pagePath} should declare top_video`);
}

for (const pagePath of publicPages) {
  const html = read(pagePath);
  assert.match(html, /<video[^>]+class="page-header-video"/, `${pagePath} should contain the rendered header video`);
  assert.match(html, /src="\/uploads\/backgrounds\/background2\.optimized\.mp4"/, `${pagePath} should load the optimized mp4`);
  assert.match(html, /poster="\/uploads\/backgrounds\/background2-poster\.(?:jpg|webp)"/, `${pagePath} should keep a poster fallback`);
}

assert.ok(!fs.existsSync(publicOriginalVideo), "public output should not include the original large background2.mp4");

console.log("video header tests passed");
