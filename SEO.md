# Search and publishing maintenance

Run `npm run build` after changing posts, then `python tools/check-seo.py` before publishing. Commit the generated HTML, `sitemap.xml`, and `robots.txt` with the source changes. The production origin is `https://yifanh.com` (also set in `CNAME`).

The build generates canonical URLs, Open Graph and Twitter previews, Person/WebSite/page structured data, related article links, and the sitemap. Use a unique lowercase, hyphenated `slug` in post frontmatter. Keep the original Markdown filename: the build preserves its old `.html` URL as an immediate redirect with a canonical link. GitHub Pages does not support repository-level HTTP redirect rules; these are HTML redirects, not server-side 301 responses. Site navigation uses `/`, `/projects/`, and `/blog/`.

Each article title supplies the sole H1. Start body sections with `##` and subsections with `###`. Use a unique `tabTitle` and an accurate `metaDescription`; quote YAML values containing a colon. Supply descriptive image alt text, and `coverAlt` when using a cover. Gallery thumbnails deliberately have empty alt text because their enclosing buttons already have accessible labels; the large selected image receives descriptive alt text.

`tools/optimize-images.py` requires Pillow. It retains original assets and generates bounded WebP images, small variants, and `assets/images/manifest.json`. Run it when adding or replacing photographs, then rebuild. The shared build adds responsive sources and intrinsic dimensions. The existing PNG social cover is used as the fallback for every page.

## Search Console

1. Sign in at https://search.google.com/search-console/.
2. Add a URL-prefix property for `https://yifanh.com/`.
3. Choose the HTML tag verification method and copy Google's complete verification meta tag into the homepage `<head>`, outside the generated `SEO:start`/`SEO:end` block. Do not invent a token.
4. Deploy the page, then click Verify. Keep the tag permanently.
5. Submit `https://yifanh.com/sitemap.xml` under Sitemaps.
6. Inspect the homepage and key article URLs, run the live test, and request indexing. Review Google's selected canonical and indexing reason if a page remains excluded.

Verification is pending until the account owner supplies the tag and Google confirms it. HTTPS enforcement and the HTTP 301 redirect were verified on GitHub Pages. Indexing and rankings are Google's decisions; these changes do not guarantee inclusion.

## Proposed backlink strategy — no outreach performed

- Link the portfolio from your existing GitHub and LinkedIn profiles.
- Link each relevant build page from its public repository README, with a useful description.
- Offer substantive completed project writeups to UCLA engineering clubs, teams, or labs with which you actually collaborate.
- Publish useful diagrams, measurements, firmware notes, and troubleshooting in the keyboard and Raspberry Pi writeups so other builders have a reason to cite them.
- Share a relevant writeup in a community only where its rules allow and it answers a real question. Avoid repeated promotional posts, paid ranking links, automated directories, and link exchanges.
- Review Search Console's Links and Performance reports monthly after verification. Evaluate relevant referring sites, impressions, clicks, and useful engagement rather than raw backlink counts.

Any profile edits, submissions, or outreach require a separate authorized action. Sources: https://developers.google.com/search/docs/essentials/spam-policies and https://support.google.com/webmasters/answer/9008080.

## Validation and remaining limits

The static check covers all published pages, old redirects, heading order, metadata, JSON-LD parsing, local resources, internal link fragments, and sitemap/canonical agreement. Browser checks cover 320, 390, 768, 1024, and 1440 pixel widths, image loading, navigation, and gallery controls. Lab checks do not establish passing field Core Web Vitals: use Search Console's real-user report once traffic data is available.

The unfinished koi page, styles, JavaScript, license, and local relay are ignored and excluded from the public navigation and sitemap. Existing local package-script and formatting-guide edits are separate work and need not be published with this SEO change.

## Page source, navigation, and production assets

All public pages ship complete static HTML, including headings, links, metadata, and JSON-LD. Breadcrumbs appear on the project archive, blog index, and articles, with matching BreadcrumbList data. `llms.txt` is regenerated from published posts; each article also has a clean `.md` source linked with `rel="alternate"`. This follows the community proposal at https://llmstxt.org/ and does not promise search or AI rankings.

`404.html` uses root-relative assets and recovery links, so it works for deeply nested missing URLs. GitHub Pages must return HTTP 404 for missing paths; keep the error page out of the sitemap and do not redirect missing URLs to the homepage.

The shared browser script contains theme and navigation controls. Only the homepage loads `oscilloscope.js`; only the project archive loads `gallery.js`; only pages containing code blocks load `code-blocks.js`. The static check caps external JavaScript at 10 KB per page and rejects source-map references. No source maps were present when this guard was added. `.gitignore` and the GitHub Pages `_config.yml` exclude maps; the deployment also excludes build scripts, raw post inputs, local tools, and development artifacts. Readable browser JavaScript remains public, as required for the browser to execute it.
