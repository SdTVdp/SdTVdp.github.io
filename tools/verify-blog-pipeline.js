"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "public");

const failures = [];

const fail = (message) => {
  failures.push(message);
};

const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const walkFiles = (directory, extension, bucket = []) => {
  if (!fs.existsSync(directory)) {
    return bucket;
  }

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkFiles(absolute, extension, bucket);
      continue;
    }

    if (entry.isFile() && absolute.toLowerCase().endsWith(extension)) {
      bucket.push(absolute);
    }
  }

  return bucket;
};

const stripQueryAndHash = (value) => String(value || "").replace(/[?#].*$/, "");

const isExternalReference = (value) =>
  /^(?:https?:)?\/\//i.test(value) || /^(?:data:|mailto:|tel:|#)/i.test(value);

const toPublicPath = (sitePath) => {
  const clean = stripQueryAndHash(sitePath);
  if (!clean || isExternalReference(clean) || !clean.startsWith("/")) {
    return null;
  }

  try {
    return path.join(publicDir, decodeURIComponent(clean.replace(/^\/+/, "")));
  } catch {
    return path.join(publicDir, clean.replace(/^\/+/, ""));
  }
};

const parseAttributes = (html) => {
  const attributes = {};
  const pattern = /([^\s"'<>/=]+)\s*=\s*(["'])(.*?)\2/g;

  for (const match of html.matchAll(pattern)) {
    attributes[match[1].toLowerCase()] = match[3];
  }

  return attributes;
};

const verifyScaffolds = () => {
  const required = [
    ["scaffolds/research.md", "## 实验"],
    ["scaffolds/research.md", "## 反思与下一步"],
    ["scaffolds/tech-note.md", "re-tech-note"],
    ["scaffolds/writeup.md", "本文仅作学习参考"],
  ];

  for (const [relativePath, expected] of required) {
    if (!exists(relativePath)) {
      fail(`missing scaffold: ${relativePath}`);
      continue;
    }

    const content = readText(relativePath);
    if (!content.includes(expected)) {
      fail(`scaffold ${relativePath} does not contain ${expected}`);
    }
  }
};

const verifySearchIndex = () => {
  const searchPath = path.join(publicDir, "search-index.json");
  if (!fs.existsSync(searchPath)) {
    fail("missing public/search-index.json");
    return;
  }

  const searchIndex = JSON.parse(fs.readFileSync(searchPath, "utf8"));
  if (!Array.isArray(searchIndex.posts)) {
    fail("search-index.json posts must be an array");
    return;
  }

  const htmlPattern =
    /<\/?(?:a|abbr|article|b|blockquote|br|code|dd|del|details|div|dl|dt|em|figcaption|figure|h[1-6]|hr|img|kbd|li|mark|ol|p|pre|s|samp|section|span|strong|sub|summary|sup|table|tbody|td|tfoot|th|thead|time|tr|u|ul)(?=[\s>/])[^>]*>/i;

  for (const post of searchIndex.posts) {
    const title = post.title || post.path || post.source || "untitled";
    for (const field of ["excerpt", "description", "content", "codeText", "formulaText"]) {
      if (typeof post[field] !== "string") {
        fail(`search post ${title} field ${field} must be a string`);
      } else if (htmlPattern.test(post[field])) {
        fail(`search post ${title} field ${field} contains HTML`);
      }
    }

    if (!Array.isArray(post.categories)) {
      fail(`search post ${title} categories must be an array`);
    }

    if (!Array.isArray(post.tags)) {
      fail(`search post ${title} tags must be an array`);
    }
  }

  const ctfPost = searchIndex.posts.find((post) => String(post.source || "").includes("2025/ctf/re/"));
  if (ctfPost) {
    const categories = ctfPost.categories || [];
    if (!categories.includes("ctf") || !categories.includes("re")) {
      fail(`expected CTF post ${ctfPost.title || ctfPost.source} to include ctf/re categories`);
    }
  }
};

const verifyImageReferences = () => {
  const htmlFiles = walkFiles(publicDir, ".html");

  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, "utf8");
    const relativeHtml = path.relative(root, htmlFile).replace(/\\/g, "/");

    for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
      const attributes = parseAttributes(match[0]);
      const src = attributes.src;

      if (src) {
        const localPath = toPublicPath(src);
        if (localPath && !fs.existsSync(localPath)) {
          fail(`missing image ${src} referenced by ${relativeHtml}`);
        }
      }

      if (attributes.srcset) {
        const candidates = attributes.srcset.split(",").map((candidate) => candidate.trim()).filter(Boolean);
        for (const candidate of candidates) {
          const candidateUrl = candidate.split(/\s+/)[0];
          const localPath = toPublicPath(candidateUrl);
          if (localPath && !fs.existsSync(localPath)) {
            fail(`missing srcset image ${candidateUrl} referenced by ${relativeHtml}`);
          }
        }
      }
    }
  }
};

verifyScaffolds();
verifySearchIndex();
verifyImageReferences();

if (failures.length > 0) {
  console.error("Blog pipeline verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("blog pipeline verification passed");
