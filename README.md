# Hack Arizona website

The new Hack Arizona site: five static pages (Home, Story, Events, Sponsor, Team) built with Vite from plain HTML, CSS and JavaScript modules. The plan is in `PLAN.md`; the component catalogue for page builders is `src/COMPONENTS.md`.

## Preview on your Mac

```sh
cd ~/Desktop/HackAZ/website
npm install
npm run dev -- --host 127.0.0.1 --port 4301      # live editing: http://127.0.0.1:4301/
npm run build && npm run preview -- --host 127.0.0.1 --port 4301   # the built site
```

## Checks

```sh
node scripts/qa.mjs 4301            # build, serve dist from a subfolder, link check, browser QA per page, contrast
node scripts/check-site.mjs         # statusFor() self-check (status pill and dock action logic)
npm run check:placeholders          # every [TBC] placeholder and unconfirmed fact; add -- --strict before launch
python3 scripts/contrast.py src/styles/tokens.css
python3 scripts/facts-md.py --check  # src/data/facts.md matches facts.json (run without --check to rewrite it)
```

If the browser step says Playwright's browser is missing (the pinned `playwright` is newer than the browser installed on the machine), point it at an installed copy: `PLAYWRIGHT_PATH=/path/to/node_modules/playwright node scripts/qa.mjs 4301`.

`scripts/qa.mjs` serves `dist` at `http://127.0.0.1:<port>/hackaz/`, the way a GitHub Pages project site serves it, checks that every link, script, stylesheet, font and image in the built HTML and CSS loads from there, then runs `scripts/qa-site.cjs` (from the minimal-motion-web skill) on each page: console errors, failed requests, horizontal overflow at 320, 375, 768 and 1440px, content left invisible, reduced motion, no JavaScript, the pause control, and focus styles. Screenshots and light and dark contact sheets land in `qa-output/<page>/` (ignored by git).

## How it fits together

| Path | What it is |
| --- | --- |
| `index.html`, `story/`, `events/`, `sponsor/`, `team/` | The pages. Each includes the shared partials and loads `base.css`, its page CSS, `shell.js` and its page module. |
| `vite.config.js` | Multi-page build, `base: './'`. A small plugin replaces `<!-- @include partials/NAME.html -->` with `src/partials/NAME.html`, `{{root}}` with the path to the site root (`./` or `../`) and marks the current page in the dock. It also preloads the display font. |
| `src/partials/` | `head-meta.html` (inline head script: theme without a flash, saved pause, loader decision, safety timeout), `header.html`, `wordmark.html` (the traced wordmark, included by the header and the Home hero), `dock.html`, `footer.html`, `loader.html`. |
| `src/styles/tokens.css` | Every colour, as role tokens, light and dark ("desert night"). Nothing else names a colour. |
| `src/styles/base.css` | Fonts, layout, type, all shared components, motion, reveals, cursor, dock, loader, view transitions, print, reduced motion. |
| `src/js/shell.js` and `src/js/shell/` | Loader, theme, pause, reveals and count-ups, cursor (magnetic, tilt), signal spine, dock, word band, tabs, copy buttons, external links. |
| `src/data/site.js` | Event config (dates, venue, registration, links; `null` means not known yet) and `statusFor(now)`. |
| `public/` | Files served as they are: `brand/` (the mark, favicon, touch icon), `grain.png`, photos, logos, team photos. Built by `npm run images` (photos) and `node scripts/optimize-brand-assets.mjs` (logos, headshots); without Sai's HackAZ folders both keep what was last built from them. |
| `src/data/facts.json` | Every fact found so far, with source and confidence, plus conflicts and unknowns. `facts.md` is generated from it by `scripts/facts-md.py`. |
| `refs/` | Reference and source files kept in the repository: `sponsors-site/` (sponsor logos from hack.arizona.edu) and `photos-sai/` (photos Sai sent in chat), each with a `SOURCES.md`. |

All internal links are relative, so the built site works at a domain root or in any subfolder.

## Brand assets

- `public/brand/hackaz-mark.svg` is the traced circle logo (identical to `brand/hackaz-mark.svg`); `favicon.svg` is the same file.
- `favicon-32.png` and `apple-touch-icon.png` (180px, on the logo's own white) were generated from it with sharp:
  ```sh
  node -e "const s=require('sharp'),m='public/brand/hackaz-mark.svg';s(m,{density:384}).resize(32,32).png().toFile('public/brand/favicon-32.png');s(m,{density:384}).resize(160,160).extend({top:10,bottom:10,left:10,right:10,background:'#FFFFFF'}).flatten({background:'#FFFFFF'}).png().toFile('public/brand/apple-touch-icon.png')"
  ```
- `public/grain.png` is the paper grain tile from the minimal-motion-web starter (sparse specks on transparency).
- The "HACK ARIZONA" wordmark (the header and the Home headline, `src/partials/wordmark.html`) is an inline SVG traced from the official lockup Sai supplied (`refs/brand/hackaz-lockup-white.webp`) by `scripts/trace-wordmark.py` (needs `pip install potracer numpy pillow`). It is drawn in `currentColor`, so it follows the theme.

## Fonts and licences

Self-hosted from npm (Fontsource), imported at the top of `base.css`. All three are under the SIL Open Font License 1.1, which allows use, bundling and redistribution with the site; the licence texts ship in each package's `LICENSE` file.

| Role | Font | Package | Licence |
| --- | --- | --- | --- |
| Sans (everything) | Schibsted Grotesk, variable weight | `@fontsource-variable/schibsted-grotesk` | OFL-1.1, Copyright 2023 The Schibsted-Grotesk Project Authors |
| Italic serif (years, names, the italic turn) | Newsreader Italic, variable weight | `@fontsource-variable/newsreader` (`wght-italic.css` only) | OFL-1.1, Copyright 2020 The Newsreader Project Authors |
| Hand (one note per screen) | Kalam 400 | `@fontsource/kalam` | OFL-1.1, Copyright (c) 2014 Indian Type Foundry |

Every face uses `font-display: swap`; the Latin Schibsted Grotesk file is preloaded in the built pages.

## Sponsor contact form

The form on `sponsor/` sends to [Web3Forms](https://web3forms.com/), which emails each enquiry to hackaz@arizona.edu. Create an access key there for hackaz@arizona.edu and put it in `src/data/site.js` (`forms.sponsorKey`); the key is public by design. Until then, and whenever sending fails, the form opens a pre-filled email to hackaz@arizona.edu instead.

## Deploy (Vercel)

`vercel.json` holds the build settings: `npm run build`, output `dist`, trailing slashes (`/story` redirects to `/story/`), and an `X-Robots-Tag: noindex` header that keeps the draft out of search engines (remove it at launch). Connect the project once at https://vercel.com/new by importing this GitHub repository; Vercel then deploys every push, `main` to production and other branches to preview URLs (Project → Settings → Environments sets which branch counts as production).

## Not done here

Nothing is deployed from this folder by hand. Placeholders (`[TBC: ...]`) must be resolved or removed before launch; `npm run check:placeholders -- --strict` fails while any remain.
