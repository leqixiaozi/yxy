(() => {
  'use strict';
  const body = document.body;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let manuallyPaused = false;
  const motionButton = document.querySelector('.motion-toggle');
  const syncMotion = () => {
    const paused = manuallyPaused || preference.matches || body.dataset.motion === 'off';
    body.classList.toggle('motion-paused', paused);
    body.classList.toggle('page-hidden', document.hidden);
    if (motionButton) {
      motionButton.textContent = preference.matches ? '已遵循减少动态效果' : (paused ? '开启动效' : '暂停动效');
      motionButton.setAttribute('aria-pressed', String(paused));
      motionButton.disabled = preference.matches || body.dataset.motion === 'off';
    }
    document.dispatchEvent(new Event('yxy:motionchange'));
  };
  preference.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  motionButton?.addEventListener('click', () => { manuallyPaused = !manuallyPaused; syncMotion(); });
  syncMotion();
  if ('IntersectionObserver' in window) {
    const artObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('art-visible', entry.isIntersecting)), {rootMargin: '40px'});
    document.querySelectorAll('.hero-art, .contact-art').forEach(el => artObserver.observe(el));
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); revealObserver.unobserve(entry.target); }
    }), {threshold: 0.08});
    document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
  }
  const menu = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');
  const closeMenu = () => { menu?.setAttribute('aria-expanded','false'); nav?.classList.remove('is-open'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); document.querySelector('.preview-tools details')?.removeAttribute('open'); } });
  document.querySelector('.copy-address')?.addEventListener('click', async () => {
    const text = document.getElementById('company-address').textContent.trim();
    const status = document.querySelector('.copy-status');
    try { await navigator.clipboard.writeText(text); status.textContent = '办公地址已复制'; }
    catch { status.textContent = '请选中上方办公地址复制'; }
  });
})();
