(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── THEME TOGGLE ─────────────────────────────────────────────────────
  // Initial theme is already set by the inline script in <head> (runs
  // before paint). This just wires up the button to flip it afterward.

  const themeToggle = document.getElementById('theme-toggle');

  if (themeToggle) {
    const setToggleLabel = (theme) => {
      themeToggle.setAttribute(
        'aria-label',
        theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'
      );
    };

    setToggleLabel(document.documentElement.getAttribute('data-theme'));

    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      setToggleLabel(next);
    });
  }

  // ── OSCILLOSCOPE CANVAS ──────────────────────────────────────────────

  const canvas = document.getElementById('osc-canvas');
  const hero   = document.getElementById('hero');

  if (canvas && hero && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    let raf, phase = 0;

    // Two palettes: dark keeps the classic bright-phosphor-on-black CRT look;
    // light uses a darker amber trace over paper, dimmer glow so it doesn't
    // just look like an inverted dark mode.
    const palettes = {
      dark: {
        clear:     'rgba(0,0,0,0.09)',
        grid:      'rgba(247,147,76,0.045)',
        glowWide:  'rgba(247,147,76,0.035)',
        glowMid:   'rgba(247,147,76,0.07)',
        trace:     'rgba(247,147,76,0.88)',
        trace2:    'rgba(204,88,3,0.28)',
      },
      light: {
        clear:     'rgba(246,241,231,0.16)',
        grid:      'rgba(193,87,31,0.07)',
        glowWide:  'rgba(193,87,31,0.05)',
        glowMid:   'rgba(193,87,31,0.09)',
        trace:     'rgba(193,87,31,0.85)',
        trace2:    'rgba(140,61,0,0.3)',
      },
    };

    function currentPalette() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? palettes.light : palettes.dark;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    // Traces a wave path once and returns it as a reusable Path2D so the
    // three passes below don't each have to recompute per-pixel Math.sin
    // calls for the same curve.
    function buildPath(W, waveFn) {
      const path = new Path2D();
      for (let x = 0; x <= W; x++) {
        x === 0 ? path.moveTo(x, waveFn(x)) : path.lineTo(x, waveFn(x));
      }
      return path;
    }

    function drawOsc() {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      const p = currentPalette();

      // Phosphor persistence — partial clear
      ctx.fillStyle = p.clear;
      ctx.fillRect(0, 0, W, H);

      // Grid lines
      ctx.strokeStyle = p.grid;
      ctx.lineWidth   = 0.5;
      const gx = 64, gy = 44;
      for (let x = 0; x < W; x += gx) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gy) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      const cy = H / 2;

      function wave(x) {
        const t = (x / W) * 4 * Math.PI + phase;
        return cy
          + Math.sin(t)             * (H * 0.175)
          + Math.sin(t * 2.3 + 1)   * (H * 0.055)
          + Math.sin(t * 0.5 + 0.6) * (H * 0.07);
      }

      const mainPath = buildPath(W, wave);

      // Glow — layered wide/mid strokes instead of shadowBlur. shadowBlur
      // forces a per-frame blur-kernel pass over the stroked region, which
      // is notably expensive in Firefox/Gecko; a couple of flat, wider,
      // low-opacity strokes look nearly identical for a cost closer to a
      // normal stroke.
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.glowWide;
      ctx.lineWidth   = 16;
      ctx.stroke(mainPath);

      ctx.strokeStyle = p.glowMid;
      ctx.lineWidth   = 8;
      ctx.stroke(mainPath);

      // Sharp trace (crisp core line, no glow needed here)
      ctx.strokeStyle = p.trace;
      ctx.lineWidth   = 1.5;
      ctx.stroke(mainPath);

      // Secondary amber trace (lower)
      function wave2(x) {
        const t = (x / W) * 7 * Math.PI + phase * 1.35;
        return cy + H * 0.17 + Math.sin(t) * (H * 0.065) + Math.sin(t * 2.7 + 0.9) * (H * 0.025);
      }
      const secondaryPath = buildPath(W, wave2);
      ctx.strokeStyle = p.trace2;
      ctx.lineWidth   = 1;
      ctx.stroke(secondaryPath);

      phase += 0.011;
      raf = requestAnimationFrame(drawOsc);
    }

    resize();
    drawOsc();
    window.addEventListener('resize', resize);

    // Pause when hero is off-screen; resume cleanly to avoid a blank canvas
    new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          cancelAnimationFrame(raf);
          raf = null;
        } else if (!raf) {
          resize();
          drawOsc();
        }
      });
    }).observe(hero);
  }

  // ── NAV: SCROLLED STATE ──────────────────────────────────────────────

  const nav = document.getElementById('nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  }

  // ── NAV: MOBILE TOGGLE ───────────────────────────────────────────────

  const navToggle = document.querySelector('.nav-toggle');
  const navLinks   = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close the mobile menu after a link is chosen
    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── NAV: ACTIVE LINK ON SCROLL ───────────────────────────────────────

  const sections     = document.querySelectorAll('main section[id]');
  const navLinkByHref = new Map();
  document.querySelectorAll('.nav-links a[href^="#"]').forEach((link) => {
    navLinkByHref.set(link.getAttribute('href').slice(1), link);
  });

  if (sections.length && navLinkByHref.size) {
    const activeObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navLinkByHref.get(entry.target.id);
        if (!link) return;
        link.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    sections.forEach((section) => activeObs.observe(section));
  }

  // ── REVEAL ON SCROLL ─────────────────────────────────────────────────

  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => revealObs.observe(el));
  }

  // ── PROJECT TIMELINE: COLLAPSIBLE ENTRIES ───────────────────────────

  const tlToggles = document.querySelectorAll('.tl-toggle');
  const expandAllBtn = document.getElementById('tl-expand-all');

  tlToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!isOpen));
      if (expandAllBtn) updateExpandAllLabel();
    });
  });

  function updateExpandAllLabel() {
    if (!expandAllBtn || !tlToggles.length) return;
    const allOpen = Array.from(tlToggles).every((t) => t.getAttribute('aria-expanded') === 'true');
    expandAllBtn.textContent = allOpen ? 'Collapse All' : 'Expand All';
  }

  if (expandAllBtn && tlToggles.length) {
    expandAllBtn.addEventListener('click', () => {
      const shouldOpen = expandAllBtn.textContent.trim() === 'Expand All';
      tlToggles.forEach((t) => t.setAttribute('aria-expanded', String(shouldOpen)));
      updateExpandAllLabel();
    });
  }

  // ── PROJECT PHOTO GALLERIES ──────────────────────────────────────────

  // If a file is missing, hide the <img> entirely rather than showing the
  // browser's default broken-image icon — the transparent bordered
  // container is left visible on its own.
  function watchForBrokenImage(img) {
    if (!img || img.dataset.fallbackWired) return;
    img.dataset.fallbackWired = 'true';
    img.addEventListener('error', () => img.classList.add('img-missing'));
    img.addEventListener('load', () => img.classList.remove('img-missing'));
    // If the browser already tried and failed before this listener attached
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      img.classList.add('img-missing');
    }
  }

  // Size the gallery-main box to match whatever media is actually
  // loaded, so object-fit never has to crop to force a mismatched ratio.
  function syncMainAspectRatio(mainEl, mediaEl) {
    const apply = () => {
      const w = mediaEl.naturalWidth  || mediaEl.videoWidth;
      const h = mediaEl.naturalHeight || mediaEl.videoHeight;
      if (w && h) mainEl.style.aspectRatio = `${w} / ${h}`;
    };

    if (mediaEl.tagName === 'VIDEO') {
      mediaEl.readyState >= 1 ? apply() : mediaEl.addEventListener('loadedmetadata', apply, { once: true });
    } else {
      (mediaEl.complete && mediaEl.naturalWidth) ? apply() : mediaEl.addEventListener('load', apply, { once: true });
    }
  }

  document.querySelectorAll('.proj-gallery img').forEach(watchForBrokenImage);

  document.querySelectorAll('.gallery-main img').forEach((img) => {
    syncMainAspectRatio(img.closest('.gallery-main'), img);
  });

  document.querySelectorAll('.proj-gallery').forEach((gallery) => {
    const mainEl = gallery.querySelector('.gallery-main');
    const thumbs = gallery.querySelectorAll('.g-thumb');
    const FADE_MS = 200; // must match the opacity transition duration in CSS

    if (!mainEl || !thumbs.length) return;

    function preload(src) {
      const img = new Image();
      img.src = src;
    }

    thumbs.forEach((thumb) => {
      // Preload on hover so the image is cached before the click lands
      thumb.addEventListener('mouseenter', () => {
        if (thumb.dataset.type !== 'video') preload(thumb.dataset.src);
      });

      thumb.addEventListener('click', () => {
        if (thumb.classList.contains('active')) return;
        thumbs.forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');

        const type    = thumb.dataset.type || 'img';
        const src     = thumb.dataset.src;
        const rotated = thumb.dataset.rotated === 'true';
        const current = mainEl.querySelector('img, video');

        const buildAndSwap = () => {
          mainEl.innerHTML = '';
          let mediaEl;

          if (type === 'video') {
            mediaEl = document.createElement('video');
            mediaEl.autoplay = true;
            mediaEl.muted = true;
            mediaEl.loop = true;
            mediaEl.playsInline = true;
            mediaEl.src = src;
          } else {
            mediaEl = document.createElement('img');
            mediaEl.className = rotated ? 'rotated' : '';
            mediaEl.alt = '';
            mediaEl.src = src;
            watchForBrokenImage(mediaEl);
          }

          mediaEl.style.opacity = '0';
          mainEl.appendChild(mediaEl);

          // Resize the box as soon as we know the new media's real ratio —
          // this kicks off the CSS aspect-ratio transition ("the open")
          // while the new media is still invisible underneath it.
          syncMainAspectRatio(mainEl, mediaEl);

          const fadeIn = () => requestAnimationFrame(() => { mediaEl.style.opacity = '1'; });

          if (type === 'video') {
            mediaEl.readyState >= 1 ? fadeIn() : mediaEl.addEventListener('loadedmetadata', fadeIn, { once: true });
          } else {
            (mediaEl.complete && mediaEl.naturalWidth) ? fadeIn() : mediaEl.addEventListener('load', fadeIn, { once: true });
          }
        };

        if (current) {
          current.style.opacity = '0';
          setTimeout(buildAndSwap, FADE_MS);
        } else {
          buildAndSwap();
        }
      });
    });
  });
})();