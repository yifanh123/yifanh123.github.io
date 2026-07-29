const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Paths pointing out of the assets/js folder
const POSTS_DIR = path.join(__dirname, '../../posts');
const OUTPUT_DIR = path.join(__dirname, '../../blog');

// Ensure the output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Updated HTML Skeleton matching your main website exactly
const createBaseHTML = (title, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- Sets the theme before first paint to avoid a flash of the wrong theme. -->
<script>
  (() => {
    const stored = localStorage.getItem('theme');
    const theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
<title>${title} | Yifan Hu Blog</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<!-- Link back to main styles -->
<link rel="stylesheet" href="../assets/css/styles.css">
</head>
<body>

<!-- NAV -->
<header>
  <nav id="nav" class="scrolled">
    <a href="../index.html" class="nav-logo">Yifan <span>Hu</span></a>

    <div class="nav-right">
      <!-- Dark/Light Mode Toggle -->
      <button type="button" class="theme-toggle" id="theme-toggle" aria-label="Switch to light theme">
        <svg class="icon-sun" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
        <svg class="icon-moon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>

      <ul class="nav-links" id="nav-links">
        <!-- Portfolio with Dropdown (pointing back to the main site) -->
        <li class="nav-dropdown">
          <a href="../index.html" class="nav-dropbtn">Portfolio</a>
          <div class="nav-dropdown-content">
            <a href="../index.html#about">About</a>
            <a href="../index.html#experience">Experience</a>
            <a href="../index.html#projects">Projects</a>
            <a href="../index.html#education">Education</a>
            <a href="../index.html#contact">Contact</a>
          </div>
        </li>
        
        <!-- Blog Link -->
        <li><a href="index.html">Blog</a></li>
      </ul>

      <!-- Hamburger Menu for Mobile -->
      <button type="button" class="nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="nav-links">
        <span></span><span></span><span></span>
      </button>
    </div>
  </nav>
</header>

<main>
  <section id="projects" style="min-height: 100vh; padding-top: 140px;">
    <div class="container">
      ${content}
    </div>
  </section>
</main>

<!-- FOOTER -->
<footer>
  <span class="footer-t">&copy; 2026 Yifan Hu &mdash; Electrical Engineering @ UCLA</span>
  <span class="footer-t">Built with precision.</span>
</footer>

<!-- Link back to main script to activate the theme toggle and hamburger menu -->
<script src="../assets/js/script.js" defer></script>
</body>
</html>
`;

async function buildSite() {
    const { marked } = await import('marked');

    const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.md'));
    const postsList = [];

    // 1. Process each Markdown file
    files.forEach(file => {
        const rawContent = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
        const parsed = matter(rawContent); 
        const htmlContent = marked.parse(parsed.content); 
        
        const postSlug = file.replace('.md', '.html');
        
        // Wrap individual post content
        const postHTML = createBaseHTML(parsed.data.title, `
            <div class="reveal">
              <h1 class="sec-title">${parsed.data.title}</h1>
              <div class="sec-label">${parsed.data.date}</div>
            </div>
            <div class="about-text reveal" style="margin-top: 40px; max-width: 800px;">
                ${htmlContent}
            </div>
        `);
        
        fs.writeFileSync(path.join(OUTPUT_DIR, postSlug), postHTML);
        
        // Save metadata for the index page
        postsList.push({
            title: parsed.data.title || 'Untitled',
            date: parsed.data.date || 'No Date',
            summary: parsed.data.summary || '',
            url: postSlug
        });
    });

    // Sort posts by date (newest first)
    postsList.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Build the Index (Snapshots) Page
    const indexCards = postsList.map(post => `
        <article class="exp-card reveal" style="margin-bottom: 24px;">
            <div class="exp-accent" aria-hidden="true"></div>
            <div class="exp-meta">
                <div>
                    <div class="exp-meta-lbl">Date</div>
                    <div class="exp-meta-val">${post.date}</div>
                </div>
            </div>
            <h2 class="exp-role" style="font-size: 2rem;">${post.title}</h2>
            <p class="tl-desc">${post.summary}</p>
            <a href="${post.url}" class="btn-s" style="margin-top: 16px;">
                Read Post
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left:6px;"><path d="m9 18 6-6-6-6"/></svg>
            </a>
        </article>
    `).join('');

    const indexContent = `
        <div class="reveal">
          <div class="sec-label">Writings</div>
          <h1 class="sec-title">Blog <em>Feed</em></h1>
        </div>
        <div class="exp-list">
            ${indexCards}
        </div>
    `;

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), createBaseHTML('Blog Feed', indexContent));
    console.log(`Successfully scanned ${files.length} markdown files and generated the blog!`);
}

// Run the script
buildSite();

// Optional: Auto-watcher
if (process.argv.includes('--watch')) {
    console.log('\nWatching for changes in /posts...');
    fs.watch(POSTS_DIR, (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
            console.log(`Detected change in ${filename}. Rebuilding...`);
            buildSite();
        }
    });
}