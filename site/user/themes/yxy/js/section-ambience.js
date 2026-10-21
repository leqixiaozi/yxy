(() => {
  'use strict';
  const sections = document.querySelectorAll('#main > section:not(#home)');
  if (!('IntersectionObserver' in window)) return; // Static artwork remains visible.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('ambient-visible', entry.isIntersecting);
  }, {threshold: 0});
  sections.forEach(section => observer.observe(section));
})();
