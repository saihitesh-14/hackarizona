// Events page module, owned by the events stage. Import shared helpers from ../shell.js (see src/COMPONENTS.md).
// Status pills and the AgX countdown follow the event's own clock (America/Phoenix), so "Upcoming" never goes stale:
// each [data-event] says Upcoming, Happening now or Ended from its data-start / data-end ('YYYY-MM-DDTHH:MM', local).
import { localStamp, site } from '../../data/site.js';

const now = localStamp(new Date(), site.event.timezone);

document.querySelectorAll('[data-event]').forEach(event => {
  const { start, end } = event.dataset;
  const state = now >= end ? 'past' : now >= start ? 'live' : 'upcoming';
  const status = event.querySelector('[data-event-status]');
  if (status) {
    status.textContent = { past: 'Ended', live: 'Happening now', upcoming: 'Upcoming' }[state];
    status.classList.toggle('is-live', state === 'live');
    status.classList.toggle('is-past', state === 'past');
  }
  // Registration closes with the event.
  if (state === 'past') event.querySelector('[data-event-register]')?.closest('.actions')?.remove();

  const countdown = event.querySelector('[data-event-countdown]');
  if (!countdown || state !== 'upcoming') return;
  const days = Math.round((Date.parse(start.slice(0, 10)) - Date.parse(now.slice(0, 10))) / 864e5);
  if (days > 0) {
    countdown.querySelector('[data-countdown-value]').textContent = String(days);
    countdown.querySelector('[data-countdown-unit]').textContent = days === 1 ? 'day' : 'days';
  } else {
    countdown.textContent = 'Today';
  }
  countdown.hidden = false;
});
