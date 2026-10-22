(() => {
  'use strict';
  const body = document.body;
  if (!body.matches('.is-home.design-constellation,.is-home.design-nexus')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const settings = {
    'services-title': {effect:'slide',words:['连接','技术','业务']},
    'approach-title': {effect:'cascade',words:['真实需求','每一个细节']},
    'about-title': {effect:'focus',words:['深圳','技术']},
    'qualifications-title': {effect:'underline',words:['有据可查']},
    'contact-title': {effect:'welcome',words:['沟通']}
  };
  const titles = [];
  const blocked = () => reduced.matches || body.classList.contains('motion-paused') || body.dataset.motion === 'off';
  function sync() {
    titles.forEach(title => title.classList.toggle('title-active', title.dataset.titleVisible === 'true' && !blocked()));
  }
  for (const [id,setting] of Object.entries(settings)) {
    const heading = document.getElementById(id);
    if (!heading) continue;
    const lines = [''];
    for (const node of heading.childNodes) {
      if (node.nodeName === 'BR') lines.push('');
      else lines[lines.length - 1] += node.textContent;
    }
    const cleanLines = lines.map(line => line.replace(/\s+/g,' ').trim()).filter(Boolean);
    const visual = document.createElement('span');
    visual.className = 'title-visual';
    visual.setAttribute('aria-hidden','true');
    let index = 0;
    cleanLines.forEach((text,lineIndex) => {
      const line = document.createElement('span');
      line.className = 'title-line';
      line.style.setProperty('--title-line',String(lineIndex));
      let offset = 0;
      function appendCharacter(parent,char) {
        // Keep closing punctuation with the preceding glyph at narrow widths.
        if (/[，。！？；：、,.!?;:]/u.test(char) && parent.lastElementChild) {
          const previous = parent.lastElementChild;
          (previous.classList.contains('title-word') ? previous.lastElementChild : previous).append(document.createTextNode(char));
          return;
        }
        const span = document.createElement('span');
        span.className = 'title-char';
        span.style.setProperty('--title-index',String(index++));
        span.textContent = char;
        parent.append(span);
      }
      while (offset < text.length) {
        const word = setting.words.find(candidate => text.startsWith(candidate,offset));
        if (word) {
          const emphasis = document.createElement('span');
          emphasis.className = 'title-word';
          for (const char of word) appendCharacter(emphasis,char);
          line.append(emphasis);
          offset += word.length;
        } else {
          const char = String.fromCodePoint(text.codePointAt(offset));
          appendCharacter(line,char);
          offset += char.length;
        }
      }
      visual.append(line);
    });
    heading.setAttribute('aria-label',cleanLines.join(' '));
    heading.replaceChildren(visual);
    heading.classList.add('motion-heading');
    heading.dataset.titleEffect = setting.effect;
    heading.dataset.titleVisible = 'false';
    titles.push(heading);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { entry.target.dataset.titleVisible = String(entry.isIntersecting); });
      sync();
    }, {threshold:.3});
    titles.forEach(title => observer.observe(title));
  }
  document.addEventListener('yxy:motionchange',sync);
  reduced.addEventListener('change',sync);
  sync();
})();
