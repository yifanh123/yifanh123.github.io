(() => {
  'use strict';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
        clear:     'rgba(11,12,14,0.09)',
        grid:      'rgba(247,147,76,0.045)',
        glowWide:  'rgba(247,147,76,0.035)',
        glowMid:   'rgba(247,147,76,0.07)',
        trace:     'rgba(247,147,76,0.88)',
        trace2:    'rgba(204,88,3,0.28)',
      },
      light: {
        clear:     'rgba(250,250,248,0.16)',
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width  = canvas.offsetWidth  * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    }

    // Traces a wave path once and returns it as a reusable Path2D so the
    // three passes below don't each have to recompute per-pixel Math.sin
    // calls for the same curve.
    function buildPath(W, waveFn) {
      const path = new Path2D();
      for (let x = 0; x <= W; x += 2) {
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

})();
