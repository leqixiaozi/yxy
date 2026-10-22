(() => {
  'use strict';
  const catalog = document.querySelector('.product-catalog');
  if (!catalog) return;
  const search = catalog.querySelector('.product-search');
  const category = catalog.querySelector('.product-category');
  if (!search || !category) return;
  const cards = [...catalog.querySelectorAll('[data-product-card]')];
  const count = catalog.querySelector('.product-count');
  const empty = catalog.querySelector('.product-empty');
  function filter() {
    const query = search.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matches = (!category.value || card.dataset.category === category.value) && (!query || card.textContent.toLocaleLowerCase().includes(query));
      card.hidden = !matches;
      visible += Number(matches);
    });
    count.textContent = `共 ${visible} 项产品`;
    empty.hidden = visible > 0;
  }
  search.addEventListener('input', filter);
  category.addEventListener('change', filter);
  catalog.querySelector('.product-reset').addEventListener('click', () => {
    search.value = '';
    category.value = '';
    filter();
    search.focus();
  });
})();
