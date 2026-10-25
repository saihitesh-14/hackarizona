/** Links and buttons every page shares: the dock's primary action, external-link marking, and copy buttons. */
import { site, statusFor } from '../../data/site.js';

/** The dock action reads "Get updates" (to the footer) until registration is open with a link in site.js. */
export function initRegister() {
  if (statusFor(new Date()) !== 'Registration open') return;
  document.querySelectorAll('[data-register]').forEach(link => {
    link.href = site.registration.url;
    link.textContent = 'Register';
  });
}

/** Links to other sites get rel="noopener external" and an aria-hidden ↗ when the markup has none. */
export function markExternal(scope = document) {
  scope.querySelectorAll('a[href]').forEach(link => {
    let url;
    try {
      url = new URL(link.href);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.host === location.host) return;
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('external');
    link.setAttribute('rel', [...rel].join(' '));
    link.classList.add('is-external');
    if (!link.querySelector('.arrow') && !link.textContent.includes('↗')) {
      link.insertAdjacentHTML('beforeend', ' <span class="arrow arrow-ne" aria-hidden="true">↗</span>');
    }
  });
}

/** <button data-copy="text" hidden> with a sibling <span data-copy-status role="status">. Hidden without JavaScript. */
export function initCopyButtons(scope = document) {
  scope.querySelectorAll('[data-copy]').forEach(button => {
    if (button.dataset.copyReady) return;
    button.dataset.copyReady = '1';
    const status = button.parentElement?.querySelector('[data-copy-status]');
    const label = button.textContent;
    let reset;
    button.hidden = false;
    button.addEventListener('click', async () => {
      clearTimeout(reset);
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(button.dataset.copy);
        if (status) status.textContent = 'Copied.';
        button.textContent = 'Copied ✓';
      } catch {
        // Without clipboard access, select the text so the visitor can copy it themselves.
        if (status) {
          status.textContent = button.dataset.copy;
          const range = document.createRange();
          range.selectNodeContents(status);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        button.textContent = 'Selected. Copy with your keyboard.';
      }
      reset = setTimeout(() => {
        button.textContent = label;
        if (status) status.textContent = '';
      }, 5000);
    });
  });
}
