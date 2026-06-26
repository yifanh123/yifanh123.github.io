// ── OSCILLOSCOPE CANVAS ────────────────────────────────────────────────

const canvas = document.getElementById('osc-canvas');
const ctx    = canvas.getContext('2d');
let raf, phase = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.offsetWidth  * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
}

function drawOsc() {
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;

  // Phosphor persistence — partial clear
  ctx.fillStyle = 'rgba(0,0,0,0.09)';
  ctx.fillRect(0, 0, W, H);

  // Grid lines
  ctx.strokeStyle = 'rgba(247,147,76,0.045)';
  ctx.lineWidth   = 0.5;
  const gx = 64, gy = 44;
  for (let x = 0; x < W; x += gx) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += gy) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  const cy = H / 2;

  function wave(x) {
    const t = (x / W) * 4 * Math.PI + phase;
    return cy
      + Math.sin(t)           * (H * 0.175)
      + Math.sin(t * 2.3 + 1) * (H * 0.055)
      + Math.sin(t * 0.5 + 0.6) * (H * 0.07);
  }

  // Glow bloom
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(247,147,76,0.10)';
  ctx.lineWidth   = 8;
  ctx.shadowColor = 'rgba(247,147,76,0.25)';
  ctx.shadowBlur  = 20;
  for (let x = 0; x <= W; x++) {
    x === 0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x));
  }
  ctx.stroke();

  // Sharp trace
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(247,147,76,0.88)';
  ctx.lineWidth   = 1.5;
  ctx.shadowColor = 'rgba(247,147,76,0.9)';
  ctx.shadowBlur  = 7;
  for (let x = 0; x <= W; x++) {
    x === 0 ? ctx.moveTo(x, wave(x)) : ctx.lineTo(x, wave(x));
  }
  ctx.stroke();

  // Secondary amber trace (lower)
  function wave2(x) {
    const t = (x / W) * 7 * Math.PI + phase * 1.35;
    return cy + H * 0.17 + Math.sin(t) * (H * 0.065) + Math.sin(t * 2.7 + 0.9) * (H * 0.025);
  }
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(204,88,3,0.28)';
  ctx.lineWidth   = 1;
  ctx.shadowColor = 'rgba(204,88,3,0.35)';
  ctx.shadowBlur  = 5;
  for (let x = 0; x <= W; x++) {
    x === 0 ? ctx.moveTo(x, wave2(x)) : ctx.lineTo(x, wave2(x));
  }
  ctx.stroke();

  ctx.shadowBlur = 0;
  phase += 0.011;
  raf = requestAnimationFrame(drawOsc);
}

resize();
drawOsc();
window.addEventListener('resize', resize);

// Pause when hero is off-screen
new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) { cancelAnimationFrame(raf); }
    else { drawOsc(); }
  });
}).observe(document.getElementById('hero'));

// ── NAV SCROLL ─────────────────────────────────────────────────────────

const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
}, { passive: true });

// ── REVEAL ON SCROLL ───────────────────────────────────────────────────

const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('visible');
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

// ── PHOTO GALLERIES ────────────────────────────────────────────────────

document.querySelectorAll('.proj-gallery').forEach(gallery => {
  const mainEl = gallery.querySelector('.gallery-main');
  const thumbs  = gallery.querySelectorAll('.g-thumb');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');

      const type    = thumb.dataset.type || 'img';
      const src     = thumb.dataset.src;
      const rotated = thumb.dataset.rotated === 'true';

      if (type === 'video') {
        mainEl.innerHTML = `<video src="${src}" autoplay muted loop playsinline></video>`;
      } else {
        mainEl.innerHTML = `<img src="${src}" alt="" ${rotated ? 'class="rotated"' : ''}>`;
      }
    });
  });
});
