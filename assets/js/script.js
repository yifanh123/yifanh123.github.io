(() => {
  'use strict';

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
        revealObs.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    revealEls.forEach((el) => revealObs.observe(el));
  }

})();
