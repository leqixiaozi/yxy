(() => {
  'use strict';
  // A fresh entry or reload always starts on Home; in-page navigation remains intact.
  const restoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  window.scrollTo({top: 0, behavior: 'instant'});
  let interacted = false;
  const markInteraction = () => { interacted = true; };
  for (const name of ['pointerdown','keydown','wheel','touchstart']) {
    window.addEventListener(name, markInteraction, {once: true, passive: true});
  }
  const resetHome = () => { if (!interacted) window.scrollTo({top: 0, behavior: 'instant'}); };
  document.addEventListener('DOMContentLoaded', resetHome, {once: true});
  window.addEventListener('pageshow', event => {
    if (event.persisted) return; // Browser Back keeps the current in-page section.
    resetHome();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      resetHome();
      history.scrollRestoration = restoration;
    }));
  }, {once: true});
})();
