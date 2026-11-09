'use strict';
(() => {
  const buttons = [document.getElementById('accountsTabButton'),document.getElementById('scheduleTabButton')];
  const panels = [document.getElementById('accountsTab'),document.getElementById('scheduleTab')];
  if ([...buttons,...panels].some(element => !element)) return;

  function showTab(index, focus = false) {
    buttons.forEach((button, i) => {
      const selected = i === index;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      button.classList.toggle('is-active', selected);
      panels[i].hidden = !selected;
    });
    if (focus) buttons[index].focus();
  }
  buttons.forEach((button, i) => {
    button.addEventListener('click', () => showTab(i));
    button.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        showTab((i + (event.key === 'ArrowRight' ? 1 : buttons.length-1)) % buttons.length,true);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        showTab(event.key === 'Home' ? 0 : buttons.length-1,true);
      }
    });
  });
  showTab(0);
})();
