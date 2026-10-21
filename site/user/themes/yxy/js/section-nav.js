(() => {
  'use strict';
  const nav = document.getElementById('main-nav');
  const sections = [...document.querySelectorAll('main > section[id]')];
  if (!nav || !sections.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let scheduled = false;
  let navigating = false;
  let navigationTimer;
  function activate(id) {
    nav.querySelectorAll('a').forEach(link => {
      if (link.hash === '#' + id) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function update() {
    scheduled = false;
    if (navigating) return;
    const line = document.querySelector('.site-header').getBoundingClientRect().bottom + Math.min(innerHeight * .23,170);
    const current = sections.filter(section => section.getBoundingClientRect().top <= line).at(-1) || sections[0];
    activate(current.id);
  }
  function go(hash, smooth, focus) {
    const section = sections.find(item => '#' + item.id === hash);
    if (!section) return;
    clearTimeout(navigationTimer);
    navigating = true;
    activate(section.id);
    section.scrollIntoView({behavior:smooth && !reduced.matches ? 'smooth' : 'instant',block:'start'});
    if (focus) {
      const heading = section.querySelector('h1,h2');
      heading?.setAttribute('tabindex','-1');
      heading?.focus({preventScroll:true});
    }
    navigationTimer = setTimeout(() => { navigating = false; update(); }, smooth && !reduced.matches ? 1000 : 50);
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search || !sections.some(item => '#' + item.id === destination.hash)) return;
    event.preventDefault();
    const navigate = () => {
      if (destination.hash !== location.hash) history.pushState(null,'',destination.hash);
      go(destination.hash,true,true);
    };
    // Give a clicked star a brief, visible pulse before moving to its section.
    if (link.matches('.star-link') && !reduced.matches && !document.body.classList.contains('motion-paused')) setTimeout(navigate,220);
    else navigate();
  });
  window.addEventListener('popstate', () => go(location.hash || '#home',false,true));
  window.addEventListener('hashchange', () => go(location.hash || '#home',false,false));
  window.addEventListener('scroll', () => { if (!scheduled) {scheduled = true; requestAnimationFrame(update);} }, {passive:true});
  document.addEventListener('keydown', event => {if (['PageDown','PageUp','Home','End','ArrowDown','ArrowUp'].includes(event.key)) navigating = false;});
  window.addEventListener('wheel', () => {navigating = false;}, {passive:true});
  window.addEventListener('touchstart', () => {navigating = false;}, {passive:true});
  go('#home',false,false);
  update();
})();
