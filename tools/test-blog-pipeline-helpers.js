"use strict";

const assert = require("node:assert/strict");

const {
  derivePostClassification,
} = require("../dist/hexo/_shared/post-classification-rules");
const {
  extractCodeText,
  extractFormulaText,
  getCategoryNames,
} = require("../dist/hexo/_shared/post-utils");

assert.deepEqual(derivePostClassification("source/_posts/archive/ctf/sample.md"), {
  categories: ["历史 WP"],
  tags: ["ctf-wp", "re-history"],
});

assert.deepEqual(derivePostClassification("source/_posts/series/re-technical-notes/vm.md"), {
  categories: ["技术笔记"],
  tags: ["re-tech-note", "vm-analysis", "crypto"],
});

assert.deepEqual(derivePostClassification("source/_posts/research/ai/transformer.md"), {
  categories: ["科研日志"],
  tags: [
    "ai-explainable",
    "deep-learning",
    "transformer",
    "self-supervised",
    "tda",
    "fluid-dynamics",
  ],
});

assert.deepEqual(derivePostClassification("source/_posts/2025/ctf/re/old.md"), {
  categories: ["ctf", "re"],
  tags: [],
});

assert.equal(extractCodeText("<pre><code>mov eax, 1</code></pre><p>x</p>"), "mov eax, 1");
assert.equal(extractFormulaText('<span class="katex">E = mc^2</span>'), "E = mc^2");
assert.deepEqual(getCategoryNames({ categories: { data: [{ name: "ctf" }, { name: "re" }] } }), [
  "ctf",
  "re",
]);

console.log("blog pipeline helper tests passed");
