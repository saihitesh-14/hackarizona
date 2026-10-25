import { createLogoDrawOn } from './loader.js';
import { createSaguaro } from './saguaro.js';

const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

let theme = systemDark ? 'dark' : 'light';
let paused = reducedMotion;

root.dataset.theme = theme;
root.dataset.motion = paused ? 'paused' : 'running';

// Logo draw-on.
const logo = createLogoDrawOn(document.querySelector('#mark-drawon'));

// 3D circuit saguaro.
const canvas = document.querySelector('#saguaro');
const saguaro = createSaguaro(
{
    canvas,
    theme,
    paused,
    onFallback()
    {
        document.querySelector('.hero-stage').classList.add('no-webgl');
    }
});

function playLogo()
{
    if (paused)
    {
        logo.showFinal();
    }
    else
    {
        logo.play();
    }
}

// Start the logo when its panel first comes into view.
const logoObserver = new IntersectionObserver((entries) =>
{
    if (entries.some((e) => e.isIntersecting))
    {
        playLogo();
        logoObserver.disconnect();
    }
}, { threshold: 0.4 });
logoObserver.observe(document.querySelector('#mark-drawon'));
logo.renderAt(0);

document.querySelector('[data-action="replay-logo"]').addEventListener('click', playLogo);
document.querySelector('[data-action="replay-saguaro"]').addEventListener('click', () => saguaro?.replay());
document.querySelector('[data-action="pulse"]').addEventListener('click', () => saguaro?.pulse());

const themeButton = document.querySelector('[data-action="theme"]');
const pauseButton = document.querySelector('[data-action="pause"]');

function syncControls()
{
    themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
    themeButton.textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.textContent = paused ? 'Play motion' : 'Pause motion';
}

themeButton.addEventListener('click', (event) =>
{
    const next = theme === 'dark' ? 'light' : 'dark';
    const swap = () =>
    {
        theme = next;
        root.dataset.theme = theme;
        saguaro?.setTheme(theme);
        syncControls();
    };
    if (document.startViewTransition && !paused)
    {
        const rect = event.currentTarget.getBoundingClientRect();
        root.style.setProperty('--reveal-x', `${rect.left + rect.width / 2}px`);
        root.style.setProperty('--reveal-y', `${rect.top + rect.height / 2}px`);
        document.startViewTransition(swap);
    }
    else
    {
        swap();
    }
});

pauseButton.addEventListener('click', () =>
{
    paused = !paused;
    root.dataset.motion = paused ? 'paused' : 'running';
    saguaro?.setPaused(paused);
    if (paused)
    {
        logo.showFinal();
    }
    syncControls();
});

syncControls();

// Testing hooks for the headless browser checks.
window.__proto = { logo, saguaro };
