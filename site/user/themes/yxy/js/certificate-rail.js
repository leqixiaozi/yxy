(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.certificate-showcase').forEach(showcase => {
    const rail = showcase.querySelector('.certificate-rail');
    const looping = showcase.dataset.loop === 'true' && rail.children.length > 1;
    const originals = [...rail.children];
    let loopStart = null, loopWidth = 0;
    if (looping) {
      originals.forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        // Keep duplicated detail links clickable, but out of the keyboard order.
        if (clone.matches('a,button,[tabindex]')) clone.tabIndex = -1;
        clone.querySelectorAll('a,button,[tabindex]').forEach(element => { element.tabIndex = -1; });
        rail.append(clone);
        if (!loopStart) loopStart = clone;
      });
    }
    let hovering = false, pressed = false, inView = !('IntersectionObserver' in window);
    let request = 0, previous = 0, position = rail.scrollLeft, direction = 1, frames = 0;
    let idleUntil = 0, idleTimer = 0, drag = null, blockClickUntil = 0;
    const blocked = () => reduced.matches || document.hidden || document.body.dataset.motion === 'off' || document.body.classList.contains('motion-paused');
    const held = () => hovering || pressed || rail.contains(document.activeElement) || performance.now() < idleUntil;
    const maxScroll = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
    function stop() { cancelAnimationFrame(request); request = 0; previous = 0; }
    function sync() {
      if (looping) loopWidth = loopStart.getBoundingClientRect().left - originals[0].getBoundingClientRect().left;
      const disabled = blocked();
      const state = disabled ? 'paused' : (!inView ? 'offscreen' : (held() ? 'held' : (maxScroll() > 1 ? 'running' : 'static')));
      rail.dataset.playState = state;
      if (state !== 'running') { stop(); return; }
      if (!request) { position = rail.scrollLeft; request = requestAnimationFrame(tick); }
    }
    function tick(now) {
      request = 0;
      if (blocked() || !inView || held()) { sync(); return; }
      if (!previous) previous = now;
      const elapsed = now - previous;
      if (elapsed >= 1000 / 30) {
        const limit = maxScroll();
        const speed = matchMedia('(max-width:760px)').matches ? 22 : 26;
        position += direction * Math.min(elapsed, 100) / 1000 * speed;
        if (looping && loopWidth > 0) {
          // The duplicate sequence starts at exactly the same visual position.
          // Wrap by one sequence width, always continuing from right to left.
          position = ((position % loopWidth) + loopWidth) % loopWidth;
        } else {
          if (position >= limit) { position = limit; direction = -1; }
          if (position <= 0) { position = 0; direction = 1; }
        }
        rail.scrollLeft = position;
        previous = now;
        rail.dataset.frames = String(++frames);
        rail.dataset.direction = String(direction);
      }
      request = requestAnimationFrame(tick);
    }
    function rest() {
      idleUntil = performance.now() + 2200;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(sync, 2250);
      sync();
    }
    rail.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } });
    rail.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovering = false; sync(); } });
    rail.addEventListener('focusin', sync);
    rail.addEventListener('focusout', () => requestAnimationFrame(sync));
    rail.addEventListener('wheel', rest, {passive: true});
    rail.addEventListener('keydown', event => {
      if (event.key !== 'Home' && event.key !== 'End') return;
      event.preventDefault();
      const end = looping ? Math.max(0, loopWidth - parseFloat(getComputedStyle(rail).columnGap) - rail.clientWidth) : maxScroll();
      rail.scrollTo({left:event.key === 'Home' ? 0 : end,behavior:reduced.matches ? 'instant' : 'smooth'});
      rest();
    });
    rail.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      pressed = true;
      drag = event.pointerType === 'mouse' ? {id:event.pointerId,x:event.clientX,left:rail.scrollLeft,moved:false} : null;
      sync();
    });
    if (looping) rail.addEventListener('dragstart', event => event.preventDefault());
    rail.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const delta = event.clientX - drag.x;
      if (!drag.moved && Math.abs(delta) < 6) return;
      if (!drag.moved) { drag.moved = true; rail.setPointerCapture(event.pointerId); }
      event.preventDefault();
      rail.scrollLeft = drag.left - delta;
    });
    function release(event) {
      if (!pressed) return;
      if (drag?.moved) {
        blockClickUntil = performance.now() + 350;
        // A mouse drag must not leave a link focused and suspend autoplay forever.
        if (rail.contains(document.activeElement)) document.activeElement.blur();
      }
      if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
      drag = null; pressed = false; rest();
    }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    rail.addEventListener('click', event => {
      if (performance.now() < blockClickUntil) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting; sync();
    }, {threshold:.05}).observe(showcase);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(rail);
    document.addEventListener('yxy:motionchange', sync);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    sync();
  });
})();
