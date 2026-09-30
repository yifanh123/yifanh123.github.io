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
  html = html.replace('</head>', `<!-- SEO:start -->
<link rel="canonical" href="${canonical}">
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
}

function redirect(url) {
  return `<!DOCTYPE html>\n<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Article moved — Yifan Hu</title><link rel="canonical" href="${ORIGIN}/blog/${url}"><meta http-equiv="refresh" content="0;url=/blog/${url}"></head><body><h1>Article moved</h1><p><a href="/blog/${url}">Continue to the article</a></p></body></html>\n`;
}
module.exports = { enhance, finish, redirect };
