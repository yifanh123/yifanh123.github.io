"""Check published HTML, local links/fragments, metadata, images and sitemap."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlparse, unquote
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self, file):
        super().__init__(convert_charrefs=True)
        self.file=file; self.tags=[]; self.ids=set(); self.headings=[]; self.jsons=[]; self.in_json=False
        self.feed(file.read_text(encoding='utf-8'))
    def handle_starttag(self, tag, attrs):
        a=dict(attrs); self.tags.append((tag,a))
        if 'id' in a: self.ids.add(a['id'])
        if tag in ('h1','h2','h3','h4','h5','h6'): self.headings.append(int(tag[1]))
        if tag=='script' and a.get('type')=='application/ld+json': self.in_json=True
    def handle_data(self,data):
        if self.in_json: self.jsons.append(json.loads(data))
    def handle_endtag(self,tag):
        if tag=='script': self.in_json=False

files=[ROOT/'index.html', ROOT/'projects/index.html', *sorted((ROOT/'blog').glob('*.html'))]
pages={f:Page(f) for f in files}
errors=[]; canonical_urls=[]; external=set()
for file,p in pages.items():
    def check(ok, message):
        if not ok: errors.append(f'{file.relative_to(ROOT)}: {message}')
    redirect=any(t=='meta' and a.get('http-equiv')=='refresh' for t,a in p.tags)
    check(p.headings.count(1)==1,'expected exactly one H1')
    for before,after in zip(p.headings,p.headings[1:]): check(after<=before+1,'skipped heading level')
    canonical=[a['href'] for t,a in p.tags if t=='link' and a.get('rel')=='canonical']
    check(len(canonical)==1 and canonical[0].startswith('https://yifanh.com/'),'canonical missing or duplicated')
    check(not any('noindex' in a.get('content','') for t,a in p.tags if t=='meta'),'noindex found')
    if not redirect:
        canonical_urls+=canonical
        check(bool(p.jsons),'missing schema')
        for key in ['description','twitter:card']:
            check(any(t=='meta' and a.get('name')==key and a.get('content') for t,a in p.tags),f'missing {key}')
        check(any(t=='meta' and a.get('property')=='og:image' and a.get('content','').startswith('https://') for t,a in p.tags),'missing absolute og:image')
    for tag,a in p.tags:
        if tag=='img':
            check('alt' in a,'missing image alt')
            check('width' in a and 'height' in a,'missing intrinsic image dimensions')
        for attr in ('href','src','data-src','poster'):
            value=a.get(attr)
            if not value: continue
            u=urlparse(value)
            if u.scheme in ('mailto','data','javascript'): continue
            if u.netloc and u.netloc!='yifanh.com':
                if tag=='a': external.add(value)
                continue
            target=(ROOT/unquote(u.path).lstrip('/')) if u.path.startswith('/') else file.parent/unquote(u.path) if u.path else file
            target=target.resolve()
            if target.is_dir(): target=target/'index.html'
            check(target.is_file(),f'broken {attr}: {value}')
            if u.fragment and target in pages: check(unquote(u.fragment) in pages[target].ids,f'broken fragment: {value}')
            check('koi-pond' not in value,'unfinished koi link is public')
sitemap=ET.parse(ROOT/'sitemap.xml')
locs=[e.text for e in sitemap.findall('.//{*}loc')]
assert sorted(locs)==sorted(canonical_urls),'sitemap/canonical mismatch'
(ROOT/'artifacts').mkdir(exist_ok=True)
(ROOT/'artifacts/external-links.json').write_text(json.dumps(sorted(external),indent=2))
if errors: raise SystemExit('\n'.join(errors))
print(f'PASS: {len(canonical_urls)} canonical pages, {len(files)-len(canonical_urls)} legacy redirects; metadata, headings, images, internal links and sitemap.')
