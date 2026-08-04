(() => {
  'use strict';

  // Runs on every blog page. Scoped to .article-body, so it's a no-op on
  // the index page (no article-body there) — safe to load everywhere.

  const COLLAPSE_LINE_THRESHOLD = 5;
  const COLLAPSED_HEIGHT_PX = 160; // roughly 5 lines at the article-body code size

  const COPY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

  const codeBlocks = document.querySelectorAll('.article-body pre');

  codeBlocks.forEach((pre) => {
    const codeEl = pre.querySelector('code');
    if (!codeEl) return;

    const lineCount = codeEl.textContent.replace(/\n$/, '').split('\n').length;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    // ── Copy button (every block) ──
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'code-copy';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    copyBtn.innerHTML = COPY_ICON;
    wrapper.appendChild(copyBtn);

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(codeEl.textContent);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = CHECK_ICON;
        copyBtn.setAttribute('aria-label', 'Copied');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = COPY_ICON;
          copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
        }, 1600);
      } catch (err) {
        // Clipboard API unavailable (e.g. insecure context) — fail quietly
      }
    });

    // ── Collapse/expand toggle (blocks over the line threshold only) ──
    if (lineCount > COLLAPSE_LINE_THRESHOLD) {
      wrapper.classList.add('collapsed');
      pre.style.maxHeight = `${COLLAPSED_HEIGHT_PX}px`;

      const toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'code-toggle';
      toggleBtn.textContent = `Show all ${lineCount} lines`;
      wrapper.appendChild(toggleBtn);

      toggleBtn.addEventListener('click', () => {
        const isCollapsed = wrapper.classList.toggle('collapsed');
        pre.style.maxHeight = isCollapsed ? `${COLLAPSED_HEIGHT_PX}px` : 'none';
        toggleBtn.textContent = isCollapsed ? `Show all ${lineCount} lines` : 'Collapse';
      });
    }
  });
})();