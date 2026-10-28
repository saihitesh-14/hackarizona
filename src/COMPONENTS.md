# Components for page builders

Everything here is styled by `src/styles/base.css` and wired by `src/js/shell.js`. Every page already loads both, plus its own `src/styles/pages/<page>.css` and `src/js/pages/<page>.js`.

## Rules

- Write only between `<!-- PAGE CONTENT START -->` and `<!-- PAGE CONTENT END -->` in your page, plus your own page CSS and JS files. Header, dock, footer and loader are partials in `src/partials/`; ask for changes, do not copy them.
- No literal colours anywhere: use the tokens in `src/styles/tokens.css` (`var(--ink)`, `var(--accent)`, ...). Need a new role? Ask for it in your report.
- Page CSS goes only in `src/styles/pages/<page>.css`. Prefix page-only classes with the page name (`.story-trace`, `.home-hero`).
- Internal links use `{{root}}`: `href="{{root}}story/"`, `href="{{root}}"` for home. Public files use a root path: `src="/img/ha26-laptop-960.jpg"` (Vite rewrites both for the subfolder build).
- Never invent facts. Unknowns get a placeholder (below). Every sentence you write goes in your report.
- Each top-level block in `main` is a `<section>` with an `id` (QA screenshots each one).
- External links: the shell adds `rel="noopener external"` and an `aria-hidden` ↗ if the markup has none. Write the arrow in the markup anyway, so it shows without JavaScript.
- Arrows: ↘ in-page (`arrow-se`), ↗ external or new context (`arrow-ne`), ↓ download (`arrow-down`), ↑ back up (`arrow-up`). Always `<span class="arrow arrow-se" aria-hidden="true">↘</span>`.
- All-caps micro labels only for sequences. At most one hand note per screen. Cards only for things you can open or hover.

## Data attributes

| Attribute | Effect |
| --- | --- |
| `data-reveal` | Fades and rises in when it enters the screen (hidden only under `html.js`, so no-JS visitors see it). Siblings entering together cascade. |
| `data-reveal="children"` | Reveals the element's children in sequence instead (use on headings: label, h2, intro). |
| `data-count` | Counts the number in its text ("400+", "$5K", "36") up from zero the first time it is 60% on screen, or when its tab opens. Final text is whatever the markup says. |
| `data-tilt` | Card tilts toward the pointer with a spotlight (mouse only). Direct children are lifted above the spotlight. |
| `data-magnetic` | Control leans toward the pointer and the cursor ring wraps it (mouse only). Its direct `.arrow` and `svg` children move further. |
| `data-cursor="Read"` | Cursor ring becomes a filled disc with this word. Add `data-cursor-style="lens"` for a hollow ring with the word below (for things to look through, like the medallion). |
| `data-placeholder="what is missing"` | Loud dashed placeholder style. Visible text like `[TBC: participant count 2026]`. Listed by `npm run check:placeholders`. Never ships. |
| `data-unconfirmed="what to confirm"` | A real fact still waiting for Sai's confirmation: dotted underline. Also listed by the checker. |
| `data-dock-section="sponsor"` | While this section crosses a line 35% down the screen, the dock's Sponsor item shows its dot (for a sponsor block on the home page, say). The current page keeps `aria-current="page"`. |
| `data-copy="text"` (on a `hidden` button) | Copy button: shown by JS, copies the text, confirms in a sibling `[data-copy-status]`. |

## JavaScript

```js
// src/js/pages/<page>.js
import { isPaused, prefersReducedMotion, onMotionChange, onThemeChange, currentTheme, countUp, enhance, asset } from '../shell.js';
import { site, statusFor } from '../../data/site.js';

const stop = onMotionChange(paused => { /* stop loops and show final states when paused; resume otherwise */ });
onThemeChange(theme => { /* 'light' | 'dark': redraw anything that read a token */ });
if (isPaused()) { /* start in the final, still state */ }
// URLs built in JavaScript must go through asset(), or they break in the subfolder build:
const photos = await fetch(asset('img/manifest.json')).then(response => response.json());
// After rendering markup with JS, wire its reveals, counters, tabs, copy buttons and external links:
enhance(container);
```

- `isPaused()` is true when the visitor paused motion or prefers reduced motion. Every loop checks it, stops off screen (`IntersectionObserver`) and in hidden tabs (`document.hidden`), and shows its final state when paused. Give each module a `sync()` like the shell's.
- Read colours for canvas or WebGL from tokens (`getComputedStyle(document.documentElement).getPropertyValue('--accent')`) and re-read them in `onThemeChange`.
- Heavy effects: skip on touch (`matchMedia('(hover: hover) and (pointer: fine)')`).
- `asset(path)` turns a path in `public/` (or a page path like `story/`) into a URL that works from any page and from a subfolder. Vite rewrites paths written in HTML and CSS, never strings in JavaScript.
- `site.js` has the event config (dates, venue, registration, links; `null` means unknown, so render a placeholder) and `statusFor(now)` for the status pill.

## Layout

```html
<section class="section section-shell" id="tracks" aria-labelledby="tracks-title">
  <div class="section-heading" data-reveal="children">
    <p class="section-name"><span>01</span> / Sequence label</p>
    <h2 id="tracks-title">Plain words, <em class="scribble">italic close.<svg class="scribble-line" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path pathLength="1" d="M3 9c30-6 62-6 96-2s68 3 98-3"/></svg></em></h2>
    <p class="section-intro">One sentence that sets up the section.</p>
  </div>
  ...
</section>
```

- `.section-shell`: the page inset (content column). `.section`: rhythm and the full-width top rule. The rule's left end is a spine pad that lights when the scroll pulse reaches it; leave `.section:before` and `.section:after` alone.
- `.section-name` is only for numbered sequences; drop it otherwise. The `.scribble` underline draws in after the heading reveals; use it once or twice per page.

## Page intro and headline

```html
<section class="page-intro section-shell entrance" id="intro" aria-labelledby="page-title">
  <p class="status-pill"><span class="status-dot" aria-hidden="true"></span>Registration opens in January</p>
  <h1 class="display" id="page-title"><span class="line"><span>Plain words,</span></span><span class="line"><span><em>italic turn.</em></span></span></h1>
  <p class="lead">One or two sentences.</p>
  <ul class="facts"><li><time datetime="2027-03-27">27 to 28 March 2027</time></li><li>HSIB</li><li>Tucson, AZ</li></ul>
  <div class="actions">
    <a class="button" href="#updates" data-magnetic>Get updates <span class="arrow arrow-se" aria-hidden="true">↘</span></a>
    <a class="text-link" href="{{root}}story/">Read our story <span class="arrow arrow-se" aria-hidden="true">↘</span></a>
  </div>
</section>
```

- `.display .line > span` rises from a mask on load (after the loader lifts). `.entrance` makes the other children fade and rise in order. Both are CSS, so they work without JavaScript and stop when paused.
- `.display` does not wrap on desktop; keep each `.line` short. On phones it wraps.

## Buttons, links, chips

```html
<a class="button" href="..." data-magnetic>Primary <span class="arrow arrow-se" aria-hidden="true">↘</span></a>
<a class="text-link" href="https://example.org/">An external page <span class="arrow arrow-ne" aria-hidden="true">↗</span></a>
<ul class="metric-chips"><li><strong data-count>400+</strong> what it measures</li></ul>
```

## Cards (tilt and spotlight)

```html
<div class="card-grid">
  <article class="card" data-reveal data-tilt>
    <div class="card-head"><p class="card-label">Label</p><p class="card-date">Date</p></div>
    <h3>A title that states the outcome</h3>
    <p class="card-summary">One sentence.</p>
    <ul class="metric-chips"><li><strong>Number</strong> what it measures</li></ul>
    <p class="card-detail"><span>Detail</span>A supporting line.</p>
    <div class="card-foot"><p class="small-print">Small print</p><a class="card-link" href="..." data-cursor="Read">Read more <span class="arrow arrow-se" aria-hidden="true">↘</span></a></div>
  </article>
</div>
```

Two columns from 900px, one below. Same structure in every card of a grid.

## Timeline

```html
<div class="timeline-track" style="--journey-progress:.5">
  <div class="timeline-line" aria-hidden="true"><span></span></div>
  <div class="timeline-entries">
    <article class="timeline-entry is-reached" data-reveal><span class="timeline-dot" aria-hidden="true"></span><p class="timeline-date">2016</p><h3>Title</h3><p>What happened.</p></article>
    <article class="timeline-entry is-current" data-reveal>...</article>
  </div>
</div>
```

Horizontal on desktop (equal columns, any count), vertical on phones. Your page JS sets `--journey-progress` (0 to 1) and the `is-reached` / `is-current` classes. (The inline `style` here is only to show the variable; set it from JS.)

## Tabs

```html
<div class="tab-list" role="tablist" aria-label="Schedule days">
  <button class="tab" type="button" role="tab" id="tab-sat" aria-controls="panel-sat" aria-selected="true">Saturday</button>
  <button class="tab" type="button" role="tab" id="tab-sun" aria-controls="panel-sun" aria-selected="false" tabindex="-1">Sunday</button>
</div>
<div class="tab-panel" id="panel-sat" role="tabpanel" aria-labelledby="tab-sat" tabindex="0">...</div>
<div class="tab-panel" id="panel-sun" role="tabpanel" aria-labelledby="tab-sun" tabindex="0">...</div>
```

The shell wires every `[role="tablist"]`: arrow keys, Home, End, automatic activation, fade-in, count-ups inside. Without JavaScript the list hides and both panels show; give each panel its own heading if that reads better.

## Questions

```html
<div class="faq-list" data-reveal>
  <details><summary>Who can come?<span class="faq-icon" aria-hidden="true"></span></summary><p>Answer built only from given facts.</p></details>
</div>
```

## Call to action (brand fill with grain)

```html
<section class="cta grain" id="join" aria-labelledby="join-title">
  <div class="cta-main" data-reveal="children">
    <h2 id="join-title">One bold line,<br><em>with a turn.</em></h2>
    <div>
      <p>One sentence.</p>
      <div class="actions">
        <a class="button" href="mailto:hackaz@arizona.edu">hackaz@arizona.edu <span class="arrow arrow-ne" aria-hidden="true">↗</span></a>
        <button class="copy-button" type="button" data-copy="hackaz@arizona.edu" hidden>Copy email</button>
        <span class="copy-status" data-copy-status role="status" aria-live="polite"></span>
      </div>
    </div>
  </div>
  <p class="note" aria-hidden="true">a sign-off</p>
</section>
```

`--brand-fill` is the logo gradient and stays the same in both themes. Focus rings turn white inside it. `.grain` works on any filled block.

## Word band

```html
<div class="marquee" aria-hidden="true"><div class="marquee-track"><span>build</span><em>demo</em>...</div></div>
```

Slides sideways with scroll; still when paused. Decorative only.

## Board, sticky notes, hand notes

```html
<div class="playground" data-reveal>
  <div class="playground-surface">
    <figure class="play-card" style="--x:40px;--y:40px;--r:-1.5deg"><img src="/img/..." alt="..." width="480" height="320" loading="lazy"><figcaption>Caption</figcaption></figure>
    <p class="play-note" style="--x:120px;--y:420px;--r:-6deg" aria-hidden="true">a note</p>
  </div>
  <p class="playground-hint" aria-hidden="true">Drag to explore</p>
</div>
<span class="sticky-note" aria-hidden="true">a note</span>
<p class="note" aria-hidden="true">a hand note</p>
```

Base styles cover the plain grid (no JavaScript), the phone swipe row and the draggable look. Dragging is not in the shell: the home page module adds `.is-draggable` and the drag, throw and coast (port `initBoard` from the starter's `sections.js`; it only enables on a fine pointer). It toggles `.is-dragging` while a drag is in progress and adds `.has-moved` after the first drag (hides the hint). `--x`, `--y`, `--r` are the hand-placed positions (the one inline style allowed).

## Placeholders

```html
<span data-placeholder="participant count 2026">[TBC: participant count 2026]</span>
<div data-placeholder="2027 tracks">[TBC: 2027 tracks]</div>
<strong data-unconfirmed="150+ or 400+ for 2026" data-count>150+</strong>
```

## Shell pieces you get for free

Loader (first visit per session, skippable), theme toggle with the circle reveal, Pause motion (dock on desktop, footer everywhere; saved; its name says the action, "Pause motion" or "Play motion", and `:root[data-motion='paused']` is the state to style against), cursor ring, signal spine, dock with the current page, footer "Get updates" block (`#updates`), page-change view transitions (header and dock stay put, `main` fades and rises), print styles (always the light theme, colours as on screen), reduced motion.

Utilities: `.sr-only` (visually hidden, still read), `.tabular` (tabular numerals for counters and clocks), `.micro` (11px all-caps label, for sequences only). Focused elements scroll clear of the dock on their own (`scroll-padding-bottom` in base.css).
