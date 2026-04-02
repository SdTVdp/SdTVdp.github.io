(() => {
  const storageKey = 'site-theme';
  const root = document.documentElement;
  const body = document.body;
  const toggle = document.querySelector('[data-theme-toggle]');
  const label = document.querySelector('[data-theme-toggle-label]');
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const preferredMedia = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const siteRoot = (body?.dataset?.siteRoot || '/').endsWith('/')
    ? (body?.dataset?.siteRoot || '/')
    : `${body?.dataset?.siteRoot || '/'}\/`;

  const readStoredTheme = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch (error) {
      return null;
    }
  };

  const writeStoredTheme = (value) => {
    try {
      localStorage.setItem(storageKey, value);
    } catch (error) {
      // Ignore storage failures and keep the current session usable.
    }
  };

  const syncThemeMeta = () => {
    if (!themeColorMeta) {
      return;
    }

    const pageBackground = getComputedStyle(root).getPropertyValue('--page-bg').trim();

    if (pageBackground) {
      themeColorMeta.setAttribute('content', pageBackground);
    }
  };

  const setTheme = (theme) => {
    root.dataset.theme = theme;

    if (label) {
      label.textContent = theme === 'dark' ? '切换浅色' : '切换夜色';
    }

    syncThemeMeta();
  };

  const initialTheme = readStoredTheme() || (preferredMedia && preferredMedia.matches ? 'dark' : 'light');
  setTheme(initialTheme);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
      writeStoredTheme(nextTheme);
    });
  }

  if (preferredMedia && typeof preferredMedia.addEventListener === 'function') {
    preferredMedia.addEventListener('change', (event) => {
      if (readStoredTheme()) {
        return;
      }

      setTheme(event.matches ? 'dark' : 'light');
    });
  }

  const searchInput = document.querySelector('[data-search-input]');
  const cards = Array.from(document.querySelectorAll('[data-card-list] .js-card'));
  const searchMeta = document.querySelector('[data-search-meta]');
  const emptyState = document.querySelector('[data-search-empty]');
  const defaultResults = document.querySelector('[data-default-results]');
  const searchResults = document.querySelector('[data-search-results]');
  const searchResultsList = document.querySelector('[data-search-results-list]');
  const searchResultsTitle = document.querySelector('[data-search-results-title]');
  let searchIndexPromise = null;

  const joinPath = (path) => `${siteRoot}${String(path || '').replace(/^\/+/, '')}`;
  const normalizeWhitespace = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const normalize = (value) => normalizeWhitespace(value).toLowerCase();
  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const tokenize = (query) => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return [];
    }

    const parts = normalizedQuery.split(/\s+/).filter(Boolean);
    const terms = parts.length > 1 ? parts : [normalizedQuery];
    return Array.from(new Set(terms));
  };

  const countOccurrences = (haystack, needle) => {
    if (!needle) {
      return 0;
    }

    let count = 0;
    let startIndex = 0;

    while (startIndex < haystack.length) {
      const index = haystack.indexOf(needle, startIndex);

      if (index === -1) {
        break;
      }

      count += 1;
      startIndex = index + needle.length;
    }

    return count;
  };

  const hashText = (value) => {
    let hash = 0;

    for (const character of String(value || '')) {
      hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
    }

    return hash;
  };

  const getTagHue = (tagName) => 18 + (hashText(normalize(tagName) || 'tag') % 320);
  const buildTagStyle = (tagName) => `--tag-hue:${getTagHue(tagName)};`;

  const highlight = (text, terms) => {
    let result = escapeHtml(text);

    terms
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)
      .forEach((term) => {
        const pattern = new RegExp(`(${escapeRegex(term)})`, 'gi');
        result = result.replace(pattern, '<mark>$1</mark>');
      });

    return result;
  };

  const trimSnippet = (text, start, end) => {
    const safeStart = start > 0 ? Math.max(0, text.lastIndexOf(' ', start - 1) + 1) : 0;
    let safeEnd = end < text.length ? text.indexOf(' ', end) : text.length;

    if (safeEnd === -1) {
      safeEnd = text.length;
    }

    let snippet = text.slice(safeStart, safeEnd).trim();

    if (safeStart > 0) {
      snippet = `...${snippet}`;
    }

    if (safeEnd < text.length) {
      snippet = `${snippet}...`;
    }

    return snippet;
  };

  const buildSnippet = (post, terms) => {
    const rawText = normalizeWhitespace(post.excerpt || post.content || '');

    if (!rawText) {
      return '';
    }

    const lower = rawText.toLowerCase();
    let hitIndex = -1;

    terms.forEach((term) => {
      const currentIndex = lower.indexOf(term);

      if (currentIndex !== -1 && (hitIndex === -1 || currentIndex < hitIndex)) {
        hitIndex = currentIndex;
      }
    });

    const start = Math.max(0, (hitIndex === -1 ? 0 : hitIndex) - 56);
    const end = Math.min(rawText.length, (hitIndex === -1 ? 132 : hitIndex + 132));
    const snippet = trimSnippet(rawText, start, end);

    return highlight(snippet, terms);
  };

  const scorePost = (post, terms) => {
    const title = normalize(post.title);
    const excerpt = normalize(post.excerpt);
    const tags = normalize((post.tags || []).join(' '));
    const content = normalize(post.content);
    const combined = [title, excerpt, tags, content].join(' ');

    if (!terms.every((term) => combined.includes(term))) {
      return null;
    }

    let score = Number(post.sticky || 0) * 5;

    terms.forEach((term) => {
      score += countOccurrences(title, term) * 40;
      score += countOccurrences(tags, term) * 24;
      score += countOccurrences(excerpt, term) * 16;
      score += Math.min(countOccurrences(content, term), 10) * 4;
    });

    return {
      ...post,
      score,
    };
  };

  const updateSearchMeta = (message) => {
    if (searchMeta) {
      searchMeta.textContent = message;
    }
  };

  const renderTagChip = (tag, terms) => `
    <a class="chip chip--link chip--tag" style="${buildTagStyle(tag)}" href="${joinPath(`tags/${encodeURIComponent(tag)}/`)}">#${highlight(tag, terms)}</a>
  `;

  const renderResultCard = (post, terms) => {
    const tags = Array.isArray(post.tags) ? post.tags : [];
    const tagsHtml = tags.length > 0
      ? `<div class="chip-row">${tags.map((tag) => renderTagChip(tag, terms)).join('')}</div>`
      : '';
    const pinHtml = Number(post.sticky || 0) > 0 ? '<span class="card__pin">置顶</span>' : '';

    return `
      <article class="card card--search ${Number(post.sticky || 0) > 0 ? 'card--sticky' : ''}">
        <div class="card__meta">
          <span>${escapeHtml(post.date || '')}</span>
          <span>${escapeHtml(post.source || '')}</span>
          ${pinHtml}
        </div>
        <h2 class="card__title"><a href="${joinPath(post.path)}">${highlight(post.title || '', terms)}</a></h2>
        <p class="card__summary">${buildSnippet(post, terms)}</p>
        ${tagsHtml}
      </article>
    `;
  };

  const renderGlobalResults = async (query) => {
    const terms = tokenize(query);

    if (terms.length === 0) {
      if (searchResults) {
        searchResults.hidden = true;
      }

      if (defaultResults) {
        defaultResults.hidden = false;
      }

      if (emptyState) {
        emptyState.hidden = true;
      }

      updateSearchMeta(`共 ${cards.length} 篇文档`);
      return;
    }

    if (!searchIndexPromise) {
      updateSearchMeta('正在加载本地全文索引...');
      searchIndexPromise = fetch(joinPath('search-index.json'), { headers: { Accept: 'application/json' } })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Search index request failed: ${response.status}`);
          }

          return response.json();
        })
        .then((payload) => Array.isArray(payload.posts) ? payload.posts : []);
    }

    try {
      const posts = await searchIndexPromise;
      const results = posts
        .map((post) => scorePost(post, terms))
        .filter(Boolean)
        .sort((left, right) => {
          const scoreDiff = right.score - left.score;
          if (scoreDiff !== 0) {
            return scoreDiff;
          }

          const stickyDiff = Number(right.sticky || 0) - Number(left.sticky || 0);
          if (stickyDiff !== 0) {
            return stickyDiff;
          }

          return String(right.date || '').localeCompare(String(left.date || ''));
        })
        .slice(0, 30);

      if (searchResultsTitle) {
        searchResultsTitle.textContent = `全文检索：${query}`;
      }

      if (searchResultsList) {
        searchResultsList.innerHTML = results.map((post) => renderResultCard(post, terms)).join('');
      }

      if (searchResults) {
        searchResults.hidden = false;
      }

      if (defaultResults) {
        defaultResults.hidden = true;
      }

      if (emptyState) {
        emptyState.hidden = results.length !== 0;
      }

      updateSearchMeta(`全文搜索 “${query}” · ${results.length} 条结果`);
    } catch (error) {
      const fallbackCount = cards.reduce((count, card) => {
        const haystack = normalize(card.dataset.search || '');
        const matched = haystack.includes(normalize(query));
        card.hidden = !matched;
        return matched ? count + 1 : count;
      }, 0);

      if (defaultResults) {
        defaultResults.hidden = false;
      }

      if (searchResults) {
        searchResults.hidden = true;
      }

      if (emptyState) {
        emptyState.hidden = fallbackCount !== 0;
      }

      updateSearchMeta(`搜索 “${query}” · ${fallbackCount}/${cards.length} 篇（索引降级）`);
      console.error(error);
    }
  };

  const initToc = () => {
    const content = document.querySelector('[data-doc-content]');
    const tocPanel = document.querySelector('[data-toc-panel]');
    const tocNav = document.querySelector('[data-toc]');

    if (!content || !tocPanel || !tocNav) {
      return;
    }

    const headings = Array.from(content.querySelectorAll('h2, h3, h4')).filter((heading) => normalizeWhitespace(heading.textContent));

    if (headings.length === 0) {
      return;
    }

    const slugify = (value) => normalizeWhitespace(value)
      .toLowerCase()
      .replace(/[^\w\u00C0-\u024F\u4E00-\u9FFF\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const usedIds = new Set(Array.from(content.querySelectorAll('[id]'))
      .map((element) => element.id)
      .filter(Boolean));

    const ensureHeadingId = (heading, index) => {
      if (heading.id) {
        usedIds.add(heading.id);
        return heading.id;
      }

      const base = slugify(heading.textContent) || `section-${index + 1}`;
      let candidate = base;
      let suffix = 2;

      while (usedIds.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }

      heading.id = candidate;
      usedIds.add(candidate);
      return candidate;
    };

    const headingItems = headings.map((heading, index) => ({
      id: ensureHeadingId(heading, index),
      level: Number(heading.tagName.slice(1)),
      text: normalizeWhitespace(heading.textContent),
      node: heading,
    }));

    tocNav.innerHTML = headingItems.map((item) => `
      <a class="toc-link toc-link--depth-${item.level}" href="#${item.id}" data-toc-link="${item.id}">${escapeHtml(item.text)}</a>
    `).join('');
    tocPanel.hidden = false;

    const links = Array.from(tocNav.querySelectorAll('[data-toc-link]'));
    const headerOffset = () => (document.querySelector('.site-header')?.offsetHeight || 0) + 44;

    const setActive = (id) => {
      links.forEach((link) => {
        link.classList.toggle('is-active', link.dataset.tocLink === id);
      });
    };

    const resolveActiveId = () => {
      const offset = headerOffset();
      let activeId = headingItems[0].id;

      headingItems.forEach((item) => {
        if (item.node.getBoundingClientRect().top <= offset) {
          activeId = item.id;
        }
      });

      return activeId;
    };

    let ticking = false;
    const updateActiveHeading = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        setActive(resolveActiveId());
        ticking = false;
      });
    };

    links.forEach((link) => {
      link.addEventListener('click', () => {
        setActive(link.dataset.tocLink || '');
      });
    });

    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    window.addEventListener('resize', updateActiveHeading);
    window.addEventListener('hashchange', updateActiveHeading);
    updateActiveHeading();
  };

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      renderGlobalResults(event.target.value);
    });

    renderGlobalResults(searchInput.value);
  }

  initToc();
})();
