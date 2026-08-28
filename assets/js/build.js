/**
 * BLOG BUILD SCRIPT
 * ────────────────────────────────────────────────────────────────────────
 * Reads every .md file in /posts, converts it to HTML, and writes fully
 * static pages into /blog (index.html + one page per post). No client-side
 * JS is needed to render posts or prev/next links — it's all baked in at
 * build time.
 *
 * USAGE
 *   npm install          (first time only)
 *   npm run build        (build once)
 *   npm run watch        (rebuild whenever a .md file changes)
 *
 * WRITING A POST  (/posts/my-post.md)
 *   ---
 *   title: My Post Title
 *   tabTitle: Short Tab Title       (optional — falls back to title)
 *   date: 2026-07-29
 *   summary: One or two sentences shown on the blog index card.
 *   metaDescription: Optional — falls back to summary if omitted.
 *   tags: [PCB Design, Firmware]
 *   cover: /assets/images/blog/my-cover.jpg     (optional)
 *   ---
 *
 *   Regular markdown body goes here.
 *
 * DRAFTS
 *   Prefix a filename with an underscore (e.g. _wip-post.md) and the
 *   build script skips it. Useful for drafts or reference notes that
 *   live in /posts but shouldn't be published.
 *
 * FORMATTING EXTENSIONS  (see posts/_formatting-guide.md for full examples)
 *
 *   Captioned image:
 *     ![Alt text](/assets/images/blog/photo.jpg "Caption shown below it")
 *
 *   Image that text wraps around:
 *     ![Alt text](/assets/images/blog/photo.jpg){.wrap-left}
 *     ![Alt text](/assets/images/blog/photo.jpg){.wrap-right}
 *     (combine with a caption too if you want: add the "quoted caption"
 *      before the {.class})
 *
 *   Two or three column layout:
 *     :::cols-2
 *     Left column markdown.
 *     +++
 *     Right column markdown.
 *     :::
 *
 *   Callout box (also: callout-tip, callout-warning):
 *     :::callout
 *     A highlighted note, worth calling out from the main text.
 *     :::
 *
 *   Image paths can be written either as `/assets/images/...` or
 *   `assets/images/...` — both resolve correctly regardless of the fact
 *   that generated pages live one folder deep, in /blog.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const POSTS_DIR = path.join(__dirname, '../../posts');
const OUTPUT_DIR = path.join(__dirname, '../../blog');

// Shown in the sign-off block at the end of every post — edit here if
// either ever changes, rather than in the template functions below.
const AUTHOR_NAME = 'Yifan Hu';
const AUTHOR_ROLE = 'Electrical Engineering @ UCLA';

// ── PATH HELPERS ─────────────────────────────────────────────────────────

// Generated pages always live one level deep (/blog/*.html), so any image
// path — whether written as "/assets/..." or "assets/..." — resolves the
// same way from there.
function resolveImgPath(src) {
  if (!src) return src;
  if (src.startsWith('/')) return `..${src}`;
  return `../${src.replace(/^\.?\//, '')}`;
}

function formatDateDisplay(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d)) return String(dateInput);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

function formatDateISO(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d)) return '';
  return d.toISOString().slice(0, 10);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── MARKDOWN PREPROCESSING ───────────────────────────────────────────────

// Handles: ![alt](src "caption"){.class .class2}
// Captions become <figcaption>, {.class} attributes (e.g. .wrap-left,
// .wrap-right) get applied to the wrapping <figure> for CSS floats.
function processImages(markdown) {
  const imgRegex = /!\[([^\]\n]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)(?:\{([^}]*)\})?/g;
  return markdown.replace(imgRegex, (match, alt, src, caption, attrs) => {
    const classes = attrs ? (attrs.match(/\.[\w-]+/g) || []).map((c) => c.slice(1)) : [];
    const resolvedSrc = resolveImgPath(src);
    const imgTag = `<img src="${resolvedSrc}" alt="${escapeHTML(alt || '')}" loading="lazy" decoding="async">`;

    if (!caption && !classes.length) return imgTag;

    const classAttr = ['post-figure', ...classes].join(' ');
    const figcaption = caption ? `<figcaption>${caption}</figcaption>` : '';
    return `<figure class="${classAttr}">${imgTag}${figcaption}</figure>`;
  });
}

// Handles :::type ... ::: blocks. "cols-2" / "cols-3" split on a "+++"
// line into side-by-side columns; anything else (callout, callout-tip,
// callout-warning, or any custom class name) becomes a single wrapped div.
// Runs marked on each block's inner content directly, since this happens
// before the surrounding document is parsed — the result is dropped back
// in as a plain HTML block, which marked then passes through untouched.
function processBlocks(markdown, marked) {
  const blockRegex = /:::([\w-]+)\n([\s\S]*?)\n:::/g;
  return markdown.replace(blockRegex, (match, type, inner) => {
    if (/^cols-\d$/.test(type)) {
      const cols = inner
        .split(/\n\+\+\+\n/)
        .map((colMd) => `<div class="blog-col">${marked.parse(colMd.trim())}</div>`);
      return `<div class="blog-cols ${type}">\n${cols.join('\n')}\n</div>`;
    }
    if (type === 'callout' || type.startsWith('callout-')) {
      const classes = type === 'callout' ? 'callout' : `callout ${type}`;
      return `<div class="${classes}">${marked.parse(inner.trim())}</div>`;
    }
    return `<div class="${type}">${marked.parse(inner.trim())}</div>`;
  });
}

function computeReadingTime(rawContent) {
  const plain = rawContent.replace(/[#*_`>\-\[\]!()]/g, ' ');
  const words = plain.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

// ── HTML TEMPLATE ─────────────────────────────────────────────────────────

function renderShell({ title, tabTitle, description, ogImage, bodyHTML }) {
  const ogImageTag = ogImage
    ? `<meta property="og:image" content="${resolveImgPath(ogImage)}">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>
  (() => {
    const stored = localStorage.getItem('theme');
    const theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
<title>${escapeHTML(tabTitle || title)} — Yifan Hu</title>
<meta name="description" content="${escapeHTML(description || '')}">

<link rel="icon" type="image/svg+xml" href="../assets/images/favicon.svg">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHTML(title)}">
<meta property="og:description" content="${escapeHTML(description || '')}">
${ogImageTag}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/css/styles.css">
<link rel="stylesheet" href="../assets/css/blog.css">
</head>
<body>

<header>
  <nav id="nav">
    <a href="../index.html" class="nav-logo">Yifan <span>Hu</span></a>
    <div class="nav-right">
      <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch to light theme">
        <svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <svg class="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
      <ul class="nav-links" id="nav-links">
        <li><a href="../index.html#about">About</a></li>
        <li><a href="../index.html#experience">Experience</a></li>
        <li><a href="../projects/index.html">Projects</a></li>
        <li><a href="../index.html#education">Education</a></li>
        <li><a href="index.html" class="active">Blog</a></li>
        <li><a href="../index.html#contact">Contact</a></li>
      </ul>
      <button type="button" class="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="nav-links">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
</header>

<main>
${bodyHTML}
</main>

<footer>
  <span class="footer-t">&copy; 2026 Yifan Hu &mdash; Electrical Engineering @ UCLA</span>
  <span class="footer-t">Built with precision.</span>
</footer>

<script src="../assets/js/script.js" defer></script>
<script src="../assets/js/code-blocks.js" defer></script>
</body>
</html>
`;
}

function renderIndexCard(post) {
  const media = post.cover
    ? `<div class="post-card-media"><img src="${resolveImgPath(post.cover)}" alt="" loading="lazy" decoding="async"></div>`
    : '';
  const tags = post.tags.map((t) => `<li class="tl-tag">${escapeHTML(t)}</li>`).join('');

  return `
    <a class="post-card" href="${post.url}">${media ? `
      ${media}` : ''}
      <div class="post-card-body">
        <div class="post-card-meta">
          <time datetime="${post.dateISO}">${post.dateDisplay}</time>
          <span class="dot-sep">&middot;</span>
          <span class="read-time">${post.readingTime}</span>
        </div>
        <h3 class="post-card-title">${escapeHTML(post.title)}</h3>
        <p class="post-card-excerpt">${escapeHTML(post.summary)}</p>
        <div class="post-card-footer">
          <ul class="tl-tags post-card-tags">${tags}</ul>
          <span class="post-card-read">
            Read
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      </div>
    </a>`;
}

function renderIndexPage(posts) {
  const cards = posts.length
    ? posts.map(renderIndexCard).join('\n')
    : '<p class="blog-empty">No posts yet — check back soon.</p>';

  const body = `
  <div class="blog-hero">
    <a href="../index.html" class="blog-crumb">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Portfolio
    </a>
    <div class="sec-label">Writeups</div>
    <h1 class="sec-title">Notes From <em>the Bench</em></h1>
    <p class="blog-intro">
      Longer-form writeups on what I am doing with my time —
      experiences on what works, what doesn't, and where I'm improving.
    </p>
  </div>
  <div class="blog-grid">
    ${cards}
  </div>`;

  return renderShell({
    title: 'Blog',
    description: 'Writeups on hardware, embedded systems, and RF projects by Yifan Hu.',
    ogImage: null,
    bodyHTML: body,
  });
}

function renderSignoff(post) {
  const initials = AUTHOR_NAME
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return `
  <div class="post-signoff">
    <div class="signoff-rule">End of Log</div>
    <div class="signoff-author">
      <div class="signoff-avatar" aria-hidden="true">${initials}</div>
      <div>
        <div class="signoff-name">${escapeHTML(AUTHOR_NAME)}</div>
        <div class="signoff-meta">
          ${escapeHTML(AUTHOR_ROLE)}
          <span class="dot-sep">&middot;</span>
          Published <time datetime="${post.dateISO}">${post.dateDisplay}</time>
        </div>
      </div>
    </div>
  </div>`;
}

function renderPostPage(post) {
  const cover = post.cover
    ? `<div class="article-cover"><img src="${resolveImgPath(post.cover)}" alt="" loading="eager" decoding="async"></div>`
    : '';
  const tags = post.tags.length
    ? `<ul class="tags article-tags">${post.tags.map((t) => `<li class="tag">${escapeHTML(t)}</li>`).join('')}</ul>`
    : '';

  const signoff = renderSignoff(post);

  const body = `
  <div class="article-header">
    <a href="index.html" class="blog-crumb">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
      Back to Blog
    </a>
    <div class="article-meta">
      <time datetime="${post.dateISO}">${post.dateDisplay}</time>
      <span class="dot-sep">&middot;</span>
      <span class="read-time">${post.readingTime}</span>
    </div>
    <h1 class="article-title">${escapeHTML(post.title)}</h1>
  </div>
  ${cover}
  <article class="article-body">
    ${post.html}
    ${tags}
  </article>
  ${signoff}`;

  return renderShell({
    title: post.title,
    tabTitle: post.tabTitle,
    description: post.metaDescription || post.summary,
    ogImage: post.cover,
    bodyHTML: body,
  });
}

// ── BUILD ─────────────────────────────────────────────────────────────────

async function buildSite() {
  const { marked } = await import('marked');
  marked.setOptions({ gfm: true, breaks: false });

  if (!fs.existsSync(POSTS_DIR)) {
    console.error(`No /posts directory found at ${POSTS_DIR}`);
    return;
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const files = fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'));

  const posts = files.map((file) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    const { data, content } = matter(raw);

    const slug = file.replace(/\.md$/, '');
    let processed = processImages(content);
    processed = processBlocks(processed, marked);
    const html = marked.parse(processed);

    return {
      slug,
      url: `${slug}.html`,
      title: data.title || 'Untitled Post',
      tabTitle: data.tabTitle || data.title || 'Untitled Post',
      date: data.date ? new Date(data.date) : new Date(),
      dateISO: formatDateISO(data.date),
      dateDisplay: formatDateDisplay(data.date),
      summary: data.summary || `${content.trim().slice(0, 160)}…`,
      metaDescription: data.metaDescription || data.summary || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      cover: data.cover || null,
      readingTime: computeReadingTime(content),
      html,
    };
  });

  // Newest first
  posts.sort((a, b) => b.date - a.date);

  posts.forEach((post) => {
    fs.writeFileSync(path.join(OUTPUT_DIR, post.url), renderPostPage(post));
  });

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), renderIndexPage(posts));

  console.log(`Built ${posts.length} post(s) → ${path.relative(process.cwd(), OUTPUT_DIR)}/`);
}

buildSite();

if (process.argv.includes('--watch')) {
  console.log('\nWatching /posts for changes...');
  fs.watch(POSTS_DIR, (eventType, filename) => {
    if (filename && filename.endsWith('.md')) {
      console.log(`Detected change in ${filename}. Rebuilding...`);
      buildSite();
    }
  });
}
