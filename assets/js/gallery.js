(() => {
  'use strict';
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
            mediaEl.alt = (thumb.getAttribute('aria-label') || 'Project photograph').replace(/^Show /, '');
            mediaEl.decoding = 'async';
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
