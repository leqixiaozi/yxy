(() => {
  'use strict';
  const body = document.body;
  if (!body.matches('.is-home.design-constellation,.is-home.design-nexus')) return;
  const heading = document.getElementById('hero-title');
  if (!heading) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const visual = document.createElement('span');
  visual.className = 'type-visual';
  visual.setAttribute('aria-hidden','true');
  heading.setAttribute('aria-label',heading.innerText.replace(/\s+/g,' ').trim());
  while (heading.firstChild) visual.append(heading.firstChild);
  const textNodes = [];
  const walker = document.createTreeWalker(visual,NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  const characters = [];
  textNodes.forEach(node => {
    const fragment = document.createDocumentFragment();
    const units = typeof Intl.Segmenter === 'function'
      ? Array.from(new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(node.textContent),part => part.segment)
      : Array.from(node.textContent);
    units.forEach(character => {
      const span = document.createElement('span');
      span.className = 'type-char';
      span.textContent = character;
      fragment.append(span);
      characters.push(span);
    });
    node.replaceWith(fragment);
  });
  heading.append(visual);
  heading.classList.add('type-heading');
  let index = 0, timer = 0, visible = false, complete = false;
  const stop = () => { clearTimeout(timer); timer = 0; };
  function finish() {
    stop();
    complete = true;
    characters.forEach(character => { character.classList.add('is-typed'); character.classList.remove('is-current'); });
    heading.dataset.typing = 'complete';
  }
  function tick() {
    timer = 0;
    if (document.hidden || !visible) return;
    if (index) characters[index - 1].classList.remove('is-current');
    if (index >= characters.length) { finish(); return; }
    const character = characters[index++];
    character.classList.add('is-typed','is-current');
    heading.dataset.typed = String(index);
    heading.dataset.typing = 'typing';
    timer = setTimeout(tick,/[，。！？、,.!?]/u.test(character.textContent) ? 240 : 105);
  }
  function sync() {
    if (reduced.matches || body.classList.contains('motion-paused') || body.dataset.motion === 'off') { finish(); return; }
    if (complete) return;
    if (document.hidden || !visible) { stop(); heading.dataset.typing = 'waiting'; return; }
    if (!timer) timer = setTimeout(tick,index ? 105 : 240);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  },{threshold:.1}).observe(heading);
  else visible = true;
  document.addEventListener('yxy:motionchange',sync);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',sync);
  sync();
})();
