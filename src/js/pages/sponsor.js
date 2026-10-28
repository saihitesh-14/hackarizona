// Sponsor page module, owned by the sponsor stage. Import shared helpers from ../shell.js (see src/COMPONENTS.md).
// The contact form: checks the two required fields, then sends the details to Web3Forms, which emails them to
// hackaz@arizona.edu. Until site.forms.sponsorKey is set (or if sending fails) it opens a pre-filled email instead.
// Without JavaScript the form falls back to its mailto: action.
import { site } from '../../data/site.js';
import { initMark } from '../mark.js';
import { isPaused, onMotionChange } from '../shell.js';
import { initSmoothScroll } from '../smooth-scroll.js';

initSmoothScroll();
initMark(document.querySelector('.sponsor-intro .mark'));

// Logo band: each row drifts at its own pace and direction, runs faster while the page scrolls (in the direction of the
// scroll), and slows to a crawl under the pointer. Rows are filled with copies so the loop never shows a gap. Runs only
// while on screen and not paused.
function initMarquee(band) {
  if (!band) return;
  const rows = [...band.querySelectorAll('.sponsor-marquee-row')].map((row, i) => {
    const track = row.querySelector('.sponsor-marquee-track');
    const original = [...track.children];
    const copy = () => original.forEach(li => track.append(li.cloneNode(true)));
    // One set's width, measured from the first logo to its first copy: the distance after which the loop repeats.
    const period = () => track.children[original.length].offsetLeft - track.children[0].offsetLeft;
    const fill = () => {
      if (track.children.length === original.length) copy();
      while (track.scrollWidth < window.innerWidth + period() * 1.2) copy();
    };
    fill();
    return { row, track, fill, period, x: 0, speed: 1, target: 1, direction: i % 2 ? 1 : -1, base: i % 2 ? 26 : 34 };
  });
  rows.forEach(r => {
    r.row.addEventListener('pointerenter', () => { r.target = 0.15; });
    r.row.addEventListener('pointerleave', () => { r.target = 1; });
  });
  let visible = false;
  let frame = 0;
  let last = 0;
  let lastScroll = window.scrollY;
  let boost = 0;
  const tick = now => {
    const seconds = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const delta = window.scrollY - lastScroll;
    lastScroll = window.scrollY;
    boost += (Math.max(-60, Math.min(60, delta)) * 6 - boost) * Math.min(1, seconds * 5);
    for (const r of rows) {
      r.speed += (r.target - r.speed) * Math.min(1, seconds * 4);
      const period = r.period();
      r.x += (r.direction * r.base * r.speed + r.direction * boost * r.speed) * seconds;
      if (r.x <= -period) r.x += period;
      if (r.x > 0) r.x -= period;
      r.track.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
    }
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    last = 0;
    if (visible && !isPaused() && !document.hidden) frame = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }).observe(band);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', () => rows.forEach(r => r.fill()));
  onMotionChange(sync);
}

// Sponsor wall: the tiles rise in one after another the first time the wall comes into view (at once when paused).
function initWall(wall) {
  if (!wall) return;
  const show = () => wall.classList.add('is-in');
  if (isPaused()) return show();
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    show();
    observer.disconnect();
  }, { threshold: 0.15 });
  observer.observe(wall);
  onMotionChange(paused => paused && show());
}

initMarquee(document.querySelector('[data-marquee]'));
initWall(document.querySelector('[data-sponsor-wall]'));

const form = document.querySelector('[data-sponsor-form]');
const status = form?.querySelector('[data-sponsor-status]');
const button = form?.querySelector('button[type="submit"]');

function say(text, kind = '') {
  status.textContent = text;
  status.className = `sponsor-status${kind ? ` is-${kind}` : ''}`;
}

/** Marks a required field and shows its message under it; returns whether it is valid. */
function check(input, message) {
  const box = input.closest('.sponsor-field');
  let note = box.querySelector('.sponsor-error');
  const valid = input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  if (valid) {
    note?.remove();
    input.removeAttribute('aria-describedby');
    return true;
  }
  if (!note) {
    note = document.createElement('p');
    note.className = 'sponsor-error';
    note.id = `${input.id}-error`;
    box.append(note);
  }
  note.textContent = message;
  input.setAttribute('aria-describedby', note.id);
  return false;
}

function details() {
  const data = new FormData(form);
  return {
    name: String(data.get('name')).trim(),
    email: String(data.get('email')).trim(),
    organisation: String(data.get('organisation') || '').trim(),
    interests: data.getAll('interests').join(', '),
    message: String(data.get('message') || '').trim(),
    botcheck: data.get('botcheck') === 'on',
  };
}

function openEmail(d) {
  const lines = [
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    d.organisation && `Organisation: ${d.organisation}`,
    d.interests && `Interested in: ${d.interests}`,
    d.message && `\n${d.message}`,
  ].filter(Boolean);
  const subject = `Sponsoring Hack Arizona${d.organisation ? `: ${d.organisation}` : ''}`;
  location.href = `mailto:${site.links.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  say('Your email app should open with your details filled in. Press send there and we will be in touch.', 'done');
}

async function send(d) {
  const response = await fetch(site.forms.sponsorEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: site.forms.sponsorKey,
      subject: `New sponsor enquiry${d.organisation ? `: ${d.organisation}` : ''}`,
      from_name: 'Hack Arizona website',
      name: d.name,
      email: d.email,
      organisation: d.organisation || '(not given)',
      interests: d.interests || '(none picked)',
      message: d.message || '(none)',
      botcheck: d.botcheck,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
}

if (form) {
  const name = form.querySelector('#sf-name');
  const email = form.querySelector('#sf-email');
  const fields = [[name, 'Please add your name.'], [email, 'Please add an email address we can reply to.']];
  fields.forEach(([input, message]) => input.addEventListener('blur', () => input.value && check(input, message)));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const valid = fields.map(([input, message]) => check(input, message));
    if (valid.includes(false)) {
      fields[valid.indexOf(false)][0].focus();
      say('');
      return;
    }
    const d = details();
    if (d.botcheck) return;
    if (!site.forms.sponsorKey) {
      openEmail(d);
      return;
    }
    button.disabled = true;
    say('Sending…');
    try {
      await send(d);
      form.reset();
      say(`Thank you, ${d.name.split(' ')[0]}. We have your details and will be in touch soon.`, 'done');
    } catch {
      say('That did not go through. Opening your email app instead.', 'error');
      openEmail(d);
    } finally {
      button.disabled = false;
    }
  });
}
