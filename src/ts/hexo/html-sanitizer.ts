import render from "dom-serializer";
import { parseDocument } from "htmlparser2";
import { type ChildNode, type Element, type ParentNode, isComment, isTag, isText } from "domhandler";

const ALLOWED_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "code",
  "dd",
  "del",
  "details",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "samp",
  "section",
  "span",
  "strong",
  "sub",
  "summary",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
]);

const DROP_CONTENT_TAGS = new Set([
  "applet",
  "base",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "meta",
  "object",
  "script",
  "select",
  "style",
  "textarea",
]);

const GLOBAL_ATTRS = new Set(["class", "id", "title", "lang", "dir", "role"]);
const TAG_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "download"]),
  img: new Set(["src", "alt", "width", "height", "loading", "decoding"]),
  ol: new Set(["start", "reversed"]),
  li: new Set(["value"]),
  td: new Set(["colspan", "rowspan"]),
  th: new Set(["colspan", "rowspan"]),
  time: new Set(["datetime"]),
  details: new Set(["open"]),
  code: new Set(["data-language"]),
  pre: new Set(["data-language"]),
};
const SAFE_TARGETS = new Set(["_blank", "_self", "_parent", "_top"]);
const SAFE_LOADING = new Set(["lazy", "eager"]);
const SAFE_DECODING = new Set(["sync", "async", "auto"]);
const SAFE_REL = new Set(["noopener", "noreferrer", "nofollow", "ugc", "external", "author", "license"]);

const isRelativeUrl = (value: string): boolean =>
  /^(?:#|\/(?!\/)|\.\/|\.\.\/|\?)/.test(value) || !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value);

const sanitizeUrlAttribute = (value: string, kind: "href" | "src"): string | null => {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return null;
  }

  const compact = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, "");
  const lowerCompact = compact.toLowerCase();

  if (kind === "src" && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|avif);base64,/i.test(lowerCompact)) {
    return trimmed;
  }

  if (compact.startsWith("//") || isRelativeUrl(compact)) {
    return trimmed;
  }

  const protocolMatch = lowerCompact.match(/^([a-z][a-z0-9+.-]*:)/i);
  if (!protocolMatch) {
    return null;
  }

  const protocol = protocolMatch[1].toLowerCase();
  if (kind === "href") {
    return ["http:", "https:", "mailto:", "tel:"].includes(protocol) ? trimmed : null;
  }

  return ["http:", "https:"].includes(protocol) ? trimmed : null;
};

const sanitizePositiveInteger = (value: string): string | null => {
  const trimmed = String(value || "").trim();
  return /^\d{1,4}$/.test(trimmed) ? trimmed : null;
};

const sanitizeSizeValue = (value: string): string | null => {
  const trimmed = String(value || "").trim();
  return /^\d{1,4}%?$/.test(trimmed) ? trimmed : null;
};

const sanitizeRel = (value: string): string | null => {
  const tokens = String(value || "")
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token && SAFE_REL.has(token));

  return tokens.length > 0 ? Array.from(new Set(tokens)).join(" ") : null;
};

const mergeRel = (existing: string | undefined, additions: string[]): string => {
  const tokens = new Set((existing || "").split(/\s+/).filter(Boolean).map((token) => token.toLowerCase()));
  additions.forEach((token) => tokens.add(token));
  return Array.from(tokens).join(" ");
};

const appendClassName = (existing: string | undefined, className: string): string => {
  const tokens = new Set((existing || "").split(/\s+/).filter(Boolean));
  tokens.add(className);
  return Array.from(tokens).join(" ");
};

const collectText = (node: ChildNode): string => {
  if (isText(node)) {
    return node.data;
  }

  if (!isTag(node)) {
    return "";
  }

  return node.children.map((child) => collectText(child)).join(" ");
};

const isCodeLikeQuote = (node: Element): boolean => {
  const text = collectText(node).replace(/\s+/g, " ").trim();
  if (!text) {
    return false;
  }

  const score =
    (/(?:^|\W)(?:unsigned|signed|char|short|int|long|float|double|const|struct|byte)(?:\W|$)/i.test(text) ? 2 : 0) +
    (/0x[0-9a-f]{2,}/i.test(text) ? 3 : 0) +
    (/\b[a-z_]\w*\s*\[\s*\]\s*=/i.test(text) ? 2 : 0) +
    ((text.match(/[{}[\];,]/g) || []).length >= 8 ? 2 : 0) +
    ((text.match(/0x[0-9a-f]+/gi) || []).length >= 4 ? 2 : 0) +
    ((text.match(/[;{}]/g) || []).length >= 2 ? 1 : 0);

  return score >= 4;
};

const sanitizeAttributes = (tagName: string, attribs: Record<string, string> | undefined): Record<string, string> => {
  const allowed = TAG_ATTRS[tagName] || new Set<string>();
  const sanitized: Record<string, string> = {};

  for (const [rawName, rawValue] of Object.entries(attribs || {})) {
    const name = rawName.toLowerCase();

    if (name === "style" || name === "srcdoc" || name.startsWith("on")) {
      continue;
    }

    const permitted =
      GLOBAL_ATTRS.has(name) ||
      allowed.has(name) ||
      name.startsWith("data-") ||
      name.startsWith("aria-");

    if (!permitted) {
      continue;
    }

    const value = String(rawValue ?? "").trim();
    if (!value && !["open", "reversed", "download"].includes(name)) {
      continue;
    }

    switch (name) {
      case "href": {
        const safe = sanitizeUrlAttribute(value, "href");
        if (safe) {
          sanitized.href = safe;
        }
        break;
      }
      case "src": {
        const safe = sanitizeUrlAttribute(value, "src");
        if (safe) {
          sanitized.src = safe;
        }
        break;
      }
      case "target": {
        const normalized = value.toLowerCase();
        if (SAFE_TARGETS.has(normalized)) {
          sanitized.target = normalized;
        }
        break;
      }
      case "rel": {
        const safe = sanitizeRel(value);
        if (safe) {
          sanitized.rel = safe;
        }
        break;
      }
      case "width":
      case "height": {
        const safe = sanitizeSizeValue(value);
        if (safe) {
          sanitized[name] = safe;
        }
        break;
      }
      case "colspan":
      case "rowspan":
      case "start":
      case "value": {
        const safe = sanitizePositiveInteger(value);
        if (safe) {
          sanitized[name] = safe;
        }
        break;
      }
      case "loading": {
        const normalized = value.toLowerCase();
        if (SAFE_LOADING.has(normalized)) {
          sanitized.loading = normalized;
        }
        break;
      }
      case "decoding": {
        const normalized = value.toLowerCase();
        if (SAFE_DECODING.has(normalized)) {
          sanitized.decoding = normalized;
        }
        break;
      }
      default:
        sanitized[name] = value;
        break;
    }
  }

  if (tagName === "a" && sanitized.target === "_blank") {
    sanitized.rel = mergeRel(sanitized.rel, ["noopener", "noreferrer", "nofollow"]);
  }

  if (tagName === "img") {
    if (!sanitized.loading) {
      sanitized.loading = "lazy";
    }

    if (!sanitized.decoding) {
      sanitized.decoding = "async";
    }
  }

  return sanitized;
};

const rewireChildren = (parent: ParentNode, children: ChildNode[]): ChildNode[] => {
  children.forEach((child, index) => {
    child.parent = parent;
    child.prev = index > 0 ? children[index - 1] : null;
    child.next = index < children.length - 1 ? children[index + 1] : null;
  });

  parent.children = children;
  return children;
};

const sanitizeNode = (node: ChildNode): ChildNode[] => {
  if (isText(node)) {
    return [node];
  }

  if (isComment(node)) {
    return [];
  }

  if (!isTag(node)) {
    return [];
  }

  const tagName = node.name.toLowerCase();

  if (DROP_CONTENT_TAGS.has(tagName)) {
    return [];
  }

  const sanitizedChildren = rewireChildren(node, node.children.flatMap((child) => sanitizeNode(child)));

  if (!ALLOWED_TAGS.has(tagName)) {
    return sanitizedChildren;
  }

  node.name = tagName;
  node.attribs = sanitizeAttributes(tagName, node.attribs);

  if (tagName === "blockquote" && isCodeLikeQuote(node)) {
    node.attribs.class = appendClassName(node.attribs.class, "quote-code-like");
  }

  if (tagName === "img" && !node.attribs.src) {
    return [];
  }

  if (tagName === "a" && !node.attribs.href) {
    delete node.attribs.target;
    delete node.attribs.rel;
  }

  return [node];
};

const sanitizeHtml = (input: string): string => {
  if (!input || !/[<&]/.test(input)) {
    return input;
  }

  const document = parseDocument(input, {
    decodeEntities: false,
    lowerCaseAttributeNames: false,
    lowerCaseTags: false,
    recognizeSelfClosing: true,
  });

  const sanitizedChildren = rewireChildren(document, document.children.flatMap((child) => sanitizeNode(child)));
  return render(sanitizedChildren, { encodeEntities: "utf8" });
};

hexo.extend.filter.register("after_post_render", (data: HexoRenderable & { more?: unknown }) => {
  if (typeof data.content === "string") {
    data.content = sanitizeHtml(data.content);
  }

  if (typeof data.excerpt === "string") {
    data.excerpt = sanitizeHtml(data.excerpt);
  }

  if (typeof data.more === "string") {
    data.more = sanitizeHtml(data.more);
  }

  return data;
});
