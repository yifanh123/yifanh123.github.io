// Shared build-time metadata and media handling for the static GitHub Pages site.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const ORIGIN = 'https://yifanh.com';
const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const person = { '@type': 'Person', '@id': `${ORIGIN}/#person`, name: 'Yifan Hu', url: `${ORIGIN}/`,
  sameAs: ['https://github.com/yifanh123', 'https://www.linkedin.com/in/yifanh11'] };

function enhance(html, url, post) {
  html = html.replace(/\r/g, '');
  const title = html.match(/<title>(.*?)<\/title>/s)[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
  const image = post?.cover ? new URL(post.cover, ORIGIN).href : `${ORIGIN}/assets/images/og-cover.png`;
  const canonical = ORIGIN + url;
  const crumbs = url === '/' ? [] : [
    { name: 'Home', url: '/' },
    ...(post ? [{ name: 'Blog', url: '/blog/' }, { name: post.title, url }] :
      [{ name: url === '/projects/' ? 'Projects' : 'Blog', url }])
  ];
  html = html.replace(/\n?<!-- SEO:start -->[\s\S]*?<!-- SEO:end -->/g, '')
    .replace(/\n?<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>/g, '');
  const schema = { '@context': 'https://schema.org', '@graph': [person,
    { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'Yifan Hu', author: { '@id': person['@id'] } },
    { '@type': post ? 'BlogPosting' : url === '/' ? 'ProfilePage' : 'CollectionPage',
      '@id': canonical + '#page', url: canonical, name: title.replace(/&amp;/g, '&'),
      description: description.replace(/&amp;/g, '&'), image,
      isPartOf: { '@id': `${ORIGIN}/#website` },
      ...(post ? { headline: post.title, datePublished: post.dateISO, author: { '@id': person['@id'] }, mainEntityOfPage: canonical } :
        url === '/' ? { mainEntity: { '@id': person['@id'] } } : {}) }
  ] };
  if (crumbs.length) {
    schema['@graph'].push({ '@type': 'BreadcrumbList', '@id': canonical + '#breadcrumbs',
      itemListElement: crumbs.map((crumb, i) => ({ '@type': 'ListItem', position: i + 1,
        name: crumb.name, item: ORIGIN + crumb.url })) });
    schema['@graph'][2].breadcrumb = { '@id': canonical + '#breadcrumbs' };
    const trail = `<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${crumbs.map((crumb, i) =>
      `<li>${i === crumbs.length - 1 ? `<span aria-current="page">${escape(crumb.name)}</span>` : `<a href="${crumb.url}">${escape(crumb.name)}</a>`}</li>`).join('')}</ol></nav>`;
    html = html.replace(/<nav class="breadcrumbs"[\s\S]*?<\/nav>|<a\b[^>]*class="(?:blog-crumb|archive-back)"[^>]*>[\s\S]*?<\/a>/, trail);
  }
  html = html.replace('</head>', `<!-- SEO:start -->
<link rel="canonical" href="${canonical}">
<link rel="describedby" href="/llms.txt" type="text/plain">
${post ? `<link rel="alternate" type="text/markdown" href="/blog/${post.slug}.md" title="Markdown source">` : ''}
<meta property="og:type" content="${post ? 'article' : 'website'}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Yifan Hu">
<meta property="og:title" content="${escape(title.replace(/&amp;/g, '&'))}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${escape(image)}">
<meta property="og:image:alt" content="${escape(post?.coverAlt || 'Yifan Hu — Electrical Engineering at UCLA')}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title.replace(/&amp;/g, '&'))}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${escape(image)}">
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
<!-- SEO:end -->
</head>`);
  // Root-relative navigation avoids duplicate /index.html links and depth errors.
  html = html.replace(/href="([^"#]*)index\.html(#[^"]*)?"/g, (_, prefix, hash = '') => {
    return `href="${new URL(prefix || './', canonical).pathname}${hash}"`;
  });
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/images/manifest.json'), 'utf8'));
  html = html.replace(/<img\b[^>]*>/g, (tag) => {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    const item = Object.values(manifest).find(m => src?.endsWith('/' + m.src)) || manifest[src?.split('/').pop()];
    if (!item) return tag;
    tag = tag.replace(/\s(?:width|height|srcset|sizes)="[^"]*"/g, '');
    tag = tag.replace(/src="[^"]*"/, `src="/assets/images/${item.src}"`);
    return tag.replace(/>$/, ` width="${item.width}" height="${item.height}" srcset="/assets/images/${item.small} ${item.smallWidth}w, /assets/images/${item.src} ${item.width}w" sizes="(max-width: 600px) calc(100vw - 48px), 560px">`);
  });
  html = html.replace(/data-src="[^"\n]*\/([^/"\n]+)"/g, (all, filename) => manifest[filename] ? `data-src="/assets/images/${manifest[filename].src}"` : all);
  html = html.replace(/(<button[^>]*class="g-thumb[^>]*>[\s\S]*?<img[^>]*sizes=")[^"]*/g, '$180px');
  // Keep each page's script payload limited to the features it renders.
  html = html.replace(/\n?<script src="[^"\n]*\/(?:script|oscilloscope|gallery|code-blocks)\.js" defer><\/script>/g, '');
  const scripts = ['script', ...(url === '/' ? ['oscilloscope'] : []),
    ...(url === '/projects/' ? ['gallery'] : []), ...(/<pre\b/.test(html) ? ['code-blocks'] : [])];
  html = html.replace('</body>', scripts.map(name => `<script src="/assets/js/${name}.js" defer></script>`).join('\n') + '\n</body>');
  return html.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '');
}

function finish(posts) {
  for (const [file, url] of [['index.html', '/'], ['projects/index.html', '/projects/']]) {
    const filename = path.join(ROOT, file);
    fs.writeFileSync(filename, enhance(fs.readFileSync(filename, 'utf8'), url));
  }
  const urls = ['/', '/projects/', '/blog/', ...posts.map(p => '/blog/' + p.url)];
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${ORIGIN}${url}</loc></url>`).join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  const safeText = value => String(value).replace(/[\r\n]+/g, ' ').replace(/[\[\]]/g, '');
  fs.writeFileSync(path.join(ROOT, 'llms.txt'), `# Yifan Hu\n\n> Portfolio and engineering build notes by Yifan Hu, an Electrical Engineering student at UCLA.\n\nThe public site covers hardware, embedded systems, PCB design, autonomous vehicles, and Raspberry Pi home servers. Project updates may describe work in progress.\n\n## Main pages\n\n- [Portfolio](${ORIGIN}/): Background, experience, education, and contact details.\n- [Projects](${ORIGIN}/projects/): Hardware and embedded systems project archive.\n- [Blog](${ORIGIN}/blog/): Engineering articles and project updates.\n\n## Articles and build notes\n\n${posts.map(post => `- [${safeText(post.title)}](${ORIGIN}/blog/${post.slug}.md): ${safeText(post.metaDescription || post.summary)}`).join('\n')}\n\n## Site navigation\n\n- [Sitemap](${ORIGIN}/sitemap.xml): Canonical public HTML pages.\n`);
}

function redirect(url) {
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Article moved — Yifan Hu</title><link rel="canonical" href="${ORIGIN}/blog/${url}"><meta http-equiv="refresh" content="0;url=/blog/${url}"></head><body><h1>Article moved</h1><p><a href="/blog/${url}">Continue to the article</a></p></body></html>\n`;
}
module.exports = { enhance, finish, redirect };
