(() => {
  'use strict';
  const body = document.body;
  if (!body.matches(':is(.design-constellation,.design-nexus).is-home')) return;
  const sections = [...document.querySelectorAll('#main > section:not(#home)')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const blocked = () => reduced.matches || document.hidden || body.dataset.motion === 'off' || body.classList.contains('motion-paused');
  let pointerFrame = 0;
  let pointerSection = null;
  let pointerPosition = null;
  const clearPointer = () => {
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pointerSection?.classList.remove('spotlight-active');
    pointerSection = null;
  };
  sections.forEach(section => {
    for (const name of ['section-transition-layer', 'section-spotlight']) {
      const layer = document.createElement('div');
      layer.className = name;
      layer.setAttribute('aria-hidden', 'true');
      section.prepend(layer);
    }
    section.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !finePointer.matches || blocked()) return;
      if (pointerSection !== section) clearPointer();
      pointerSection = section;
      pointerPosition = {x: event.clientX, y: event.clientY};
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (!pointerSection || blocked()) return;
        const rect = pointerSection.getBoundingClientRect();
        pointerSection.style.setProperty('--spotlight-x', `${pointerPosition.x - rect.left}px`);
        pointerSection.style.setProperty('--spotlight-y', `${pointerPosition.y - rect.top}px`);
        pointerSection.classList.add('spotlight-active');
      });
    }, {passive: true});
    section.addEventListener('pointerleave', clearPointer);
  });
  // Clear the old pointer position when scrolling instead of leaving a detached glow.
  window.addEventListener('scroll', clearPointer, {passive: true});
  const feed = document.querySelector('#news .news-feed-scroll');
  const items = feed ? [...feed.querySelectorAll('.news-list > li')] : [];
  const moduleEntries = [...document.querySelectorAll('#products .module-heading, #products .content-grid > .content-card, #news .news-intro, #qualifications > .section-intro, #qualifications .certificate-grid > .certificate-tile, #qualifications .certificate-groups > .certificate-showcase')];
  let newsObserver;
  const revealAll = () => items.forEach(item => item.classList.add('news-entered'));
  const sync = () => {
    if (blocked()) {
      clearPointer();
      if (reduced.matches || body.dataset.motion === 'off' || body.classList.contains('motion-paused')) {
        revealAll();
        moduleEntries.forEach(item => item.classList.add('module-entered'));
      }
    }
  };
  document.addEventListener('yxy:motionchange', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  finePointer.addEventListener('change', clearPointer);
  if (!('IntersectionObserver' in window)) return;
  const visible = new Set();
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    const middle = innerHeight * .4;
    const current = [...visible].sort((a, b) => {
      const distance = s => { const r = s.getBoundingClientRect(); return r.top <= middle && r.bottom >= middle ? 0 : Math.min(Math.abs(r.top - middle), Math.abs(r.bottom - middle)); };
      return distance(a) - distance(b);
    })[0];
    sections.forEach(section => section.classList.toggle('section-current', section === current));
  }, {rootMargin: '-15% 0px -25% 0px', threshold: [0, .25, .6]});
  sections.forEach(section => observer.observe(section));
  if (!reduced.matches) {
    const moduleObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('module-entered');
        else if (!blocked()) entry.target.classList.remove('module-entered');
      });
    }, {rootMargin: '0px 0px -6% 0px', threshold: .12});
    moduleEntries.forEach(item => {
      item.classList.add('module-entry');
      const index = [...item.parentElement.children].indexOf(item);
      const delay = item.matches('.content-card, .certificate-tile') ? index * 130 + 100 : (item.classList.contains('certificate-showcase') ? index * 130 + 180 : 0);
      item.style.setProperty('--module-delay', `${delay}ms`);
      moduleObserver.observe(item);
    });
  }
  if (feed && !reduced.matches) {
    items.forEach((item, index) => item.style.setProperty('--news-delay', `${(index % 3) * 130 + 140}ms`));
    feed.classList.add('news-motion-ready');
    const sectionObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) {
        newsObserver?.disconnect();
        if (!blocked()) items.forEach(item => item.classList.remove('news-entered'));
        return;
      }
      newsObserver?.disconnect();
      newsObserver = new IntersectionObserver(rows => {
        rows.forEach(row => {
          if (!row.isIntersecting) return;
          row.target.classList.add('news-entered');
          newsObserver.unobserve(row.target);
        });
      }, {root: feed, threshold: .12});
      items.forEach(item => newsObserver.observe(item));
    }, {threshold: .12});
    sectionObserver.observe(document.querySelector('#news'));
    feed.addEventListener('focusin', event => event.target.closest('.news-list > li')?.classList.add('news-entered'));
  }
  sync();
})();
