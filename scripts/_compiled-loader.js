"use strict";

const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const vm = require("node:vm");

module.exports = function loadCompiled(hexoContext, entryName) {
  globalThis.__sdtvdpHexoContext = hexoContext;

  const entryPath = path.join(__dirname, "..", "dist", "hexo", entryName);

  if (!fs.existsSync(entryPath)) {
    throw new Error(`[hexo-typescript] Missing compiled entry: ${entryName}. Run \"npm run build\" or \"npm run server\" first.`);
  }

  const source = fs.readFileSync(entryPath, "utf8");
  const moduleInstance = new Module(entryPath);
  moduleInstance.filename = entryPath;
  moduleInstance.paths = Module._nodeModulePaths(path.dirname(entryPath));

  function req(request) {
    return moduleInstance.require(request);
  }

  req.resolve = (request) => Module._resolveFilename(request, moduleInstance);
  req.main = require.main;
  req.extensions = Module._extensions;
  req.cache = Module._cache;

  const wrapped = `(async function(exports, require, module, __filename, __dirname, hexo){${source}\n});`;
  const fn = vm.runInThisContext(wrapped, { filename: entryPath });
  return fn(moduleInstance.exports, req, moduleInstance, entryPath, path.dirname(entryPath), hexoContext);
};
