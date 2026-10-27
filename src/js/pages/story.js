// Story page module, owned by the story stage. Import shared helpers from ../shell.js (see src/COMPONENTS.md).
// The signal trace: a pulse runs down the timeline with the scroll and each chapter's pad lights as it passes; between
// 2020 and 2025 the trace is dashed and the pulse dims. And the film slot: "coming soon" until site.film.src is set.
import { site } from '../../data/site.js';
import { isPaused, onMotionChange } from '../shell.js';
import { initSmoothScroll } from '../smooth-scroll.js';

initSmoothScroll();

function initTrace(track) {
  if (!track) return;
  const trace = track.querySelector('.story-trace');
  const clip = trace.querySelector('.story-trace-clip');
  const fill = trace.querySelector('.story-trace-fill');
  const pulse = trace.querySelector('.story-pulse');
  const chapters = [...track.querySelectorAll('[data-chapter]')];
  let pads = []; // each chapter's pad position along the trace, in px
  let dropFrom = 0;
  let dropTo = 0;
  let height = 0;
  let frame = 0;

  // Positions are measured once per layout (and on resize), never during the scroll.
  const measure = () => {
    const top = trace.getBoundingClientRect().top;
    height = trace.offsetHeight;
    pads = chapters.map(chapter => chapter.querySelector('.story-pad').getBoundingClientRect().top - top + 9);
    const drop = chapters.findIndex(c => c.classList.contains('is-drop'));
    const reboot = chapters.findIndex(c => c.classList.contains('is-reboot'));
    dropFrom = pads[drop];
    dropTo = pads[reboot];
    trace.style.setProperty('--drop-start', `${dropFrom}px`);
    trace.style.setProperty('--drop-end', `${dropTo}px`);
  };

  const draw = () => {
    frame = 0;
    // The pulse sits where the middle of the screen crosses the trace.
    const top = trace.getBoundingClientRect().top;
    const y = isPaused() ? height : Math.max(0, Math.min(height, window.innerHeight * 0.55 - top));
    const p = height ? y / height : 1;
    clip.style.transform = `translateY(${((p - 1) * 100).toFixed(3)}%)`;
    fill.style.transform = `translateY(${((1 - p) * 100).toFixed(3)}%)`;
    pulse.style.transform = `translateY(${y.toFixed(1)}px)`;
    pulse.classList.toggle('is-dim', y > dropFrom + 4 && y < dropTo - 4);
    pulse.hidden = isPaused();
    chapters.forEach((chapter, i) => chapter.classList.toggle('is-reached', y >= pads[i] - 2));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(draw);
  };

  measure();
  draw();
  window.addEventListener('scroll', schedule, { passive: true });
  new ResizeObserver(() => {
    measure();
    schedule();
  }).observe(track);
  onMotionChange(schedule);
}

// The film: a play button that loads the video (a file, with captions if given, or a YouTube embed) only when pressed.
function initFilm(box) {
  if (!box || !site.film.src) return;
  const label = box.querySelector('[data-film-label]');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'story-film-label';
  button.innerHTML = label.innerHTML;
  button.querySelector('strong').textContent = 'Watch the film';
  button.querySelector('p span').textContent = 'Our story, from 2015 to today';
  label.replaceWith(button);
  button.addEventListener('click', () => {
    const youtube = site.film.src.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    let player;
    if (youtube) {
      player = document.createElement('iframe');
      player.src = `https://www.youtube-nocookie.com/embed/${youtube[1]}?autoplay=1&rel=0`;
      player.title = 'Hack Arizona: our story';
      player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      player.allowFullscreen = true;
    } else {
      player = document.createElement('video');
      player.src = site.film.src;
      player.controls = true;
      player.autoplay = true;
      player.playsInline = true;
      if (site.film.captions) {
        const track = document.createElement('track');
        Object.assign(track, { kind: 'captions', srclang: 'en', label: 'English', src: site.film.captions, default: true });
        player.append(track);
      }
    }
    box.append(player);
    button.remove();
    player.focus?.();
  }, { once: true });
}

initTrace(document.querySelector('[data-story-track]'));
initFilm(document.querySelector('[data-film]'));
