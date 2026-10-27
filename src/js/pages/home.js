// Home page module, owned by the home stage. Import shared helpers from ../shell.js (see src/COMPONENTS.md).
import { localStamp, site, statusFor } from '../../data/site.js';
import { initIntro } from './home-intro.js';
import { initMark } from '../mark.js';
import { initMoments } from './home-moments.js';

initMark(document.querySelector('.home-hero .mark'));
initIntro(document.querySelector('.home-hero'));
initMoments(document.querySelector('#moments'));

// The status pill and the days to go, judged on the event's own clock (America/Phoenix). The markup already says
// "Registration opens in January", so without JavaScript the page is only stale once January arrives.
const now = new Date();
const status = document.querySelector('[data-status-text]');
if (status) status.textContent = statusFor(now);

const countdown = document.querySelector('[data-countdown]');
if (countdown) {
  const today = localStamp(now, site.event.timezone).slice(0, 10);
  const days = Math.round((Date.parse(site.event.start) - Date.parse(today)) / 864e5);
  if (days > 0) {
    countdown.querySelector('[data-countdown-days]').textContent = String(days);
    countdown.querySelector('[data-countdown-unit]').textContent = days === 1 ? 'day' : 'days';
    countdown.hidden = false;
  }
}
