/** Tabs: every [role="tablist"] with [role="tab"] buttons whose aria-controls name a [role="tabpanel"]. Roving
    tabindex, arrow keys plus Home and End, automatic activation; the opened panel fades in and its [data-count]
    figures count up. Without JavaScript the list is hidden (base.css) and every panel shows. Adapted from the starter. */
import { isPaused, prefersReducedMotion } from './state.js';
import { countUp } from './reveals.js';

export function initTabs(scope = document) {
  const canMove = () => !isPaused() && !prefersReducedMotion();
  scope.querySelectorAll('[role="tablist"]').forEach(tablist => {
    if (tablist.dataset.tabsReady) return;
    tablist.dataset.tabsReady = '1';
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    if (!tabs.length || panels.some(panel => !panel)) return;
    const counted = new WeakSet();

    function select(index, { focus = false, animate = true } = {}) {
      tabs.forEach((tab, position) => {
        const selected = position === index;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        panels[position].hidden = !selected;
      });
      const panel = panels[index];
      if (focus) tabs[index].focus();
      if (animate && canMove() && panel.animate) {
        panel.animate([{ opacity: 0, transform: 'translate3d(0, 10px, 0)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
      if (!animate) return;
      panel.querySelectorAll('[data-count]').forEach(figure => {
        if (counted.has(figure)) return;
        counted.add(figure);
        countUp(figure);
      });
    }

    tabs.forEach((tab, index) => tab.addEventListener('click', () => select(index)));
    tablist.addEventListener('keydown', event => {
      const current = tabs.indexOf(document.activeElement);
      if (current < 0) return;
      const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      select((next + tabs.length) % tabs.length, { focus: true });
    });
    const initial = Math.max(0, tabs.findIndex(tab => tab.getAttribute('aria-selected') === 'true'));
    select(initial, { animate: false });
  });
  return { sync() {} };
}
