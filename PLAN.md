# Hack Arizona website: plan

Status: draft for Sai's review. Updated 26 Oct 2026.
Built with: the `minimal-motion-web` skill (design language, motion, interaction, QA), plus the skills already in `HackAZ/website/.agents/skills` (`frontend-design`, the GSAP set, `web-design-guidelines`, `vercel-react-view-transitions`).

**Confirmed by Sai**

- Hack Arizona 2027: 27 to 28 March 2027, at HSIB (Health Sciences Innovation Building).
- Registration opens in January 2027.
- Hack Arizona was founded in 2015; the first hackathon was in 2016.
- No 3D hero (26 Oct 2026). The hero is an image that blends into the page. For now that is the 2025 photo of the team in front of the giant lit-up logo wall, faded into the paper; Sai may supply a better image.
- Participants: 2025, 100; 2024, 180+ (26 Oct 2026).
- Use the information on the official site, https://hack.arizona.edu/ (26 Oct 2026).
- Show every sponsor listed on https://hack.arizona.edu/sponsors (26 Oct 2026).

**Built so far** (in `HackAZ/website`)

- `brand/hackaz-mark.svg`: the circle logo as a vector, traced from the PNG (matches it apart from anti-aliased edge pixels).
- `prototypes/motion/`: the logo draw-on (loader idea), tested in a browser.
- The 3D logo medallion was written, then dropped at Sai's request on 26 Oct 2026 (the code is in git history, commit 7f00768).
- The shared shell (header, dock, footer, loader, theme, pause, reveals, cursor, signal spine), colour tokens, optimised photos, logos and headshots.
- Home page (26 Oct 2026): hero with the logo-wall photo faded into the page, numbers, what Hack Arizona is, the 2025 challenges and winners, all 19 sponsors from the official site, questions, and the join block. Answers carried over from 2026 are marked unconfirmed for 2027.
- Story, Events, Sponsor and Team: not built yet (title and placeholder only).

---

## 1. What I looked at

**Your assets (HackAZ folder)**

| Asset | What it tells the site |
| --- | --- |
| Circle logo, screen logo, Discord banner, UA lockup | The mark is a saguaro drawn as a circuit: a trunk and two arms that end in round pads, inside a circle filled with a red to plum to navy gradient. Colours sampled: navy `#0C234B`, red `#AB0520`, logo red `#AA1F23`, logo plum `#322141`, white. |
| `hackaz.jpg.webp` | A panorama of a packed auditorium from the early years, the logo on the big screen. This is the "it used to be huge" image for the story. |
| 2025 photos (191) | Award ceremony slides: Amazon Prime Marketing Challenge, Improve UA Challenge, Biosphere 2 Challenge. Team photos in maroon shirts in front of the giant logo wall. |
| 2026 photos (391) and HackAZImages (93) | Bright room with a red wall, a projector countdown ("HACKING ENDS IN 23:21:49"), keynote title cards, and sponsor slides on the screens (MLH, Responsible AI, Nuclearn and others). |
| Organizer headshots | 10 current, 5 previous. Consistent framing, good for a team grid. |
| Sponsor logos (21 files) | General Dynamics (SVG), Amazon, Nuclearn, EP Academy, RTX, ASUA, UA CS, GitHub, MLH, Responsible AI, Center for the Philosophy of Freedom. Mostly PNG. |
| `01 Branding/Logo.png` | This is the Arizona Table Tennis logo, not Hack Arizona. Probably misfiled. |

**The references**

| Site | Keep or adapt | Skip |
| --- | --- | --- |
| DevHacks '26 | First screen answers when, where, apply. Real crowd photography as proof. A partner strip. Questions written for the nervous first-timer ("Not a CS major?"). A sponsor call to action at the end. | Near-black page with one orange accent (their brand, and a very common look). Celebrity testimonials we do not have. |
| DevLabs home | Proof that the community actually builds. Count-ups. One playful interactive demo near the top. | The cream grid-paper page, the typing search demo (their signature idea), all the hiring and pricing content. |
| DevLabs about | A story told by year with a photo per chapter. A small team section with roles. | Their horizontal card carousel with arrows. We will tell the story by scrolling, not clicking. |
| DevLabs events | One page that lists every event as a chapter with a real stat strip, upcoming ones first. | The Figma-style selection handles around photos (their signature). |
| Momentum | One cinematic, full-bleed moment. | The serif display face and the rocket imagery. |

Nothing below copies their layouts, copy, colours or signature ideas. The patterns we borrow (a first-screen facts card, an events archive, a story by year) are common vocabulary for event sites.

---

## 2. Direction

Three options. I recommend **A**, with the countdown clock from B.

### A. Signal (recommended)

The whole site speaks the language of the logo: **traces and pulses**. Everything that moves is a signal travelling along a circuit trace and lighting a pad when it arrives. It is specific to Hack Arizona (a saguaro made of circuitry) and gives every animation a reason to exist.

- Light theme: cool white paper, navy ink, Arizona red as the one accent.
- Dark theme: "desert night", deep navy surfaces, never black.
- Hero: a real photo, the giant lit-up Hack Arizona logo with the team in front of it, faded into the page so it has no hard edge, in either theme.
- Story page: the trace runs through the years. In 2020 the signal fails and the trace goes dark. In 2025 it reboots.

### B. Night shift

Dark first, photo-led. The hero is the old auditorium panorama fading into a 2026 photo, with a big projector-style countdown. Motion is mostly photographic (slow push-ins, crossfades). Strong mood, but closest to the DevHacks look.

### C. Field notes

An editorial Sonoran field notebook: grain, hand-written labels, tracks shown as specimen cards. Charming, but reads less "tech" and would undersell the sponsors.

**Why A:** it is the only option where the motion explains something (where you are, what happened to Hack Arizona, how the day runs) instead of decorating. From B we keep the countdown clock, because the projector timer is a real artefact of your event.

---

## 3. Site map

Five pages. Every page shares the header, the floating dock and the footer.

| Page | Job | Main visitors |
| --- | --- | --- |
| `/` Home (Hack Arizona 2027) | When, where, how to join; what it is; schedule, tracks, prizes when ready; sponsors; questions | Hackers, sponsors |
| `/story` Our story | Founded 2015, first hackathon 2016, to today: the rise, the pandemic, back to zero, the rebuild. Hosts the story video (part 2) | Everyone, press, alumni, sponsors |
| `/events` Events | Every event as a chapter: Hack Arizona 2027 (upcoming), AgX HackDay (15 Nov 2026), Hack Arizona 2026, MLH HackDay, Hack Arizona 2025, the early years | Returning hackers, sponsors checking track record |
| `/sponsor` Sponsor | Who attends, what sponsors get, past sponsors, how to get the packet | Sponsors |
| `/team` Team | Current organizers, past organizers, founders and alumni | Everyone; recruiting new organizers |

Team could fold into Story if you prefer fewer pages. Navigation: a slim header (logo, one action) and a floating dock at the bottom with Story, Events, Sponsor, Team, the theme toggle and the primary action ("Join" or "Register").

---

## 4. Page plans

### 4.1 Home

```
+--------------------------------------------------------------+
| (logo) Hack Arizona                      [ Get updates ]     |
|--------------------------------------------------------------|
| Tucson, AZ                                      2027 edition |
|                                                              |
| (o) Registration opens in January   .-----------------.      |
|                                     |   hero photo     |     |
| HACK ARIZONA                        |  (logo wall,     |     |
| is back.                            |  fades into page)|     |
|                                     '-----------------'      |
| 24 hours to build something real.                            |
| Mar 27 to 28, 2027 | HSIB | 24 hours                         |
|                                                              |
| [ Get updates ]   Read our story                             |
|                                                              |
| 00d 00h 00m to hacking starts             (pause motion)     |
|--------------------------------------------------------------|
| sponsor logos strip                                          |
+--------------------------------------------------------------+
```

Sections, top to bottom (cut any without real content):

1. **Hero.** Status pill driven by dates ("Registration opens soon", "Registration open until ...", "Happening now", "See you next year"). Display headline (draft below). Facts row with `<time datetime>`. Primary and secondary actions. Countdown in the projector style, minutes resolution.
2. **Numbers band.** Count-ups, real past figures only, each labelled with its year.
3. **What is Hack Arizona.** Two or three sentences plus a photo.
4. **Tracks and challenges.** Cards with tilt and spotlight; prizes as chips. Hidden until 2027 tracks exist; until then, "Past challenges" (Amazon Prime Marketing, Improve UA, Biosphere 2) can stand in, clearly labelled 2025.
5. **Schedule.** Tabs for Saturday and Sunday, a trace timeline, all times in Arizona time (MST; Arizona does not use daylight saving, so say so). During the event a pulse marks "now".
6. **Photo board.** A draggable board of real photos with a couple of hand-written captions. Drag, throw, it settles.
7. **Sponsors.** Logo wall by tier, as supplied, consistent optical height. Hover: spotlight only.
8. **Questions.** Native `details`: cost, who can come, beginners, teams, what to bring, travel, code of conduct.
9. **Call to action.** A block filled with the logo's own red to navy gradient (with grain): "Join us" and "Sponsor us".
10. **Footer.** Code of conduct, contact (hackaz@arizona.edu), Instagram @hack.arizona, Discord, MLH badge if applicable.

### 4.2 Story

This is the page your video idea comes from. The page tells the story in text and photos; the film (part 2) sits at the top and can be added later without redesigning anything.

```
| 2015 o----  Founded                                         |
| 2016 o----  First hackathon        [early-years panorama]  |
|      |                                                     |
| [yr] o----  At its biggest          [crowd photo]           |
|      |                                                     |
| 2020 x....  The pandemic. The signal drops.  (trace dims)  |
|      :                                                     |
| ---- 0 ---  Back to zero                                   |
|      :                                                     |
| 2025 o====  Rebooted                [2025 team photo]       |
|      |                                                     |
| 2026 o====  [figure] hackers        [2026 photo]            |
|      |                                                     |
| 2027 o~~~~  What comes next          -> Join / Sponsor      |
```

- The trace on the left is the timeline. As you read, a pulse travels down it and each year's pad lights up.
- At 2020 the pulse flickers and stops; the trace turns grey and dashed; a big counter falls to 0.
- At 2025 the pad pings red and the trace comes back brighter. 2026 and 2027 run at full strength.
- No scroll-jacking, no pinning that traps the reader. Six or seven chapters, one screen each at most.
- A "The people who started it" block (founders, with permission) and "The people rebuilding it" (links to Team).
- Video slot: poster image, captions, loads only when played.

### 4.3 Events

Upcoming first, then past, newest to oldest. Each event is a chapter: name, date, place, one photo, a stat strip (count-ups), sponsors, and a link (registration, recap or gallery). Status pills are driven by dates so "Upcoming" never goes stale. AgX HackDay links out to getconnecto.app, marked as external.

### 4.4 Sponsor

Who attends (majors, years, numbers, all real), what sponsors get (challenges, tabling, judging, recruiting, workshops), past sponsors wall, a quote or two from sponsors with permission, and one clear action: "Request the sponsorship packet" (email) or a download, depending on what you want public. No prices unless you decide to publish them.

### 4.5 Team

A grid of tilting headshot cards (name, role, one line). Past organizers below. Founders and alumni linked from Story.

---

## 5. Motion map

One line per moving thing. Anything that cannot say what it explains gets cut.

| What moves | Trigger | How | What it explains |
| --- | --- | --- | --- |
| Loader | First visit only, skippable | The logo draws itself as a trace, pads pop, a pulse climbs the trunk, then a wipe, about 1.8s | This is Hack Arizona; the visual language of the site |
| Hero headline | Page load | Lines rise from a mask, 1.15s | Where to start reading |
| Hero photo | Load | Fades in and settles from a slight zoom, once | The real event, under the real logo |
| Countdown | Every minute | Digits roll like the projector clock | How long until hacking starts |
| Signal spine | Scroll | A faint vertical trace on the page edge; a small pulse tracks your position and lights a pad at each section | Where you are on the page |
| Numbers band | First time in view | Count up once, 1.4s | Scale, at a glance |
| Track cards | Hover | Tilt and spotlight | That the card is interactive |
| Schedule timeline | Tab open, and live during the event | Progress fills along the trace; "now" pulses | What is happening when |
| Photo board | Drag | Throw, coast, settle on a spring | Invitation to look around |
| Story trace | Scroll through the story | Pulse travels; fails at 2020; reboots at 2025 | The whole history in one gesture |
| Theme toggle | Click | Circle reveal from the toggle, 0.7s; sun to moon | That the theme changed, and where from |
| Page change | Navigation | Native cross-page view transition; header and dock stay put | Same site, new page |
| Cursor | Pointer devices only | Ring grows on links, says "drag" on the board, wraps magnetic buttons | What you can do here |

**Guard rails:** a visible Pause motion button; `prefers-reduced-motion` respected from the first frame; render loops stop off screen and in hidden tabs; no heavy effects on touch devices; nothing that is already visible jumps.

---

## 6. Look and feel

### Colour (roles, from your brand)

| Role | Light | Dark ("desert night") |
| --- | --- | --- |
| Paper (page) | cool white, derived from navy | deep navy, darker than `#0C234B` |
| Ink (text, filled buttons) | navy `#0C234B` | near white |
| Accent (one role: links, live dots, pads) | Arizona red `#AB0520` | a lighter red for text (red on navy is only 2.0:1) |
| Brand fill (loader, call to action) | the logo's gradient, red to plum `#322141` to navy | same in both themes |
| Lines | navy at low opacity | white at low opacity |

Checked: red on white 7.6:1, navy on white 15.5:1, red on a cool white 7.0:1, white on plum 14.7:1. Every pair gets checked again with `contrast.py` during the build.

### Type

Do you have brand fonts? If not, I will propose open-licence fonts in three roles: one confident sans for everything, an italic serif used only for years and names in the Story, and a legible hand for at most one note per screen. Countdown and stats use tabular numerals. I am deliberately not using Manrope (DevLabs' font).

### Texture and surfaces

A very light paper grain, hairline rules instead of boxes, construction lines at the column edges (they double as the signal spine), and soft shadows only on things that float (dock, cards, photos on the board).

### Checked against generic defaults

Per `frontend-design`, I reviewed this plan for the looks every generated site lands on, and changed:

- Cream background to a cool white taken from your navy.
- Near-black dark mode to a deep navy night.
- All-caps labels above every heading: used only where the content is a sequence (Story years, schedule).
- Arrows on every button: only where they mean something (external links get one).
- Identical rounded SaaS cards everywhere: cards only for things you can open or hover; everything else is type and hairlines.

---

## 7. How it will be built

- **Plain HTML, CSS and JavaScript modules, built with Vite** into a static site. Every word and link works without JavaScript.
- **Starting point:** the `minimal-motion-web` starter (dock, cursor, theme reveal, reveals, loader, pause control, QA scripts).
- **GSAP** (the skills in your website folder) for the Story trace (`MotionPath`, `DrawSVG`), scroll links (`ScrollTrigger`), the board (`Draggable` and `Inertia`), with `gsap.matchMedia()` for reduced motion.
- **View Transitions:** the native cross-document version (no React needed) for page changes.
- **Hero image:** a normal responsive photo (AVIF, WebP, JPEG) with a soft radial mask, so it melts into the paper in both themes. No WebGL and no three.js.
- **Images:** resized to AVIF and WebP with JPEG fallback; lazy loaded; the photo board uses about 12 photos, not 400.
- **Hosting:** GitHub Pages or Vercel, your call; custom domain to decide.
- **QA every round:** `qa-site.cjs` in a real browser, contact sheets in both themes and at phone width, frozen mid-animation frames, `contrast.py`, keyboard pass, Lighthouse.
- **Working with you:** I commit locally and stop. You get screenshots and a one-line command to preview it on your Mac. Nothing is pushed or deployed until you say so.

### Phases

1. **Inputs** (your answers below).
2. **Tokens and static pages:** all five pages, real content, no motion. Screenshots to you.
3. **Motion layer:** hero object, loader, reveals, count-ups, cursor, theme, board.
4. **Story page:** the trace, the 2020 drop, the reboot. Video slot.
5. **QA and polish:** both themes, phones, reduced motion, contrast, speed.
6. **Launch:** domain, analytics if wanted, then deploy on your go-ahead.

---

## 8. Draft headlines (for your review, not final)

- Home: "Hack Arizona *is back.*" / "Build something real *in 24 hours.*"
- Story: "We started from zero. *Twice.*" / "The signal never really went out."
- Sponsor: to write with you; the obvious lines are too close to DevHacks.
- Call to action: "Come build *with us.*"

---

## 9. What I need from you

In order of importance:

1. **"Hack Arizona" text lockup:** the circle mark is done as SVG; the text lockup PNG is too small to trace, so I need the font name or a vector file. Also: `01 Branding/Logo.png` is the Table Tennis logo.
2. **Registration and MLH:** venue (HSIB) and opening month (January) are confirmed. Still open: the registration platform and link, and whether it is an MLH member event (if yes, the site must show the MLH Trust Badge and link the MLH Code of Conduct).
3. **Story facts:** founded 2015 and first hackathon 2016 are confirmed. Still open: founders' names and permission to name them, the biggest year and its numbers, the last event before the pandemic, and confirmation that the restart was 2025.
4. **Numbers:** participants and projects for 2025 and 2026 (I have "150+" for spring 2026 from your note to Ian, and "400+" elsewhere; which is right?), Discord members (300+?), prize totals.
5. **Sponsors:** which logos may appear and under which year; whether 2027 sponsors (General Dynamics, Amazon) can be announced; whether sponsor tiers or prices should be public.
6. **Brand fonts**, if any, and whether the site may use the University of Arizona lockup.
7. **Domain:** do you own one (or the old one), or should this live on a new domain?
8. **Photos and quotes:** permission to use event photos; testimonials from winners who got internships (quote, name, consent).
9. **Taglines:** is "Bear Down, Build Up!" (on a 2026 slide) your theme to reuse?

I can start the static pages with placeholders for anything still open; placeholders will be clearly marked and never shipped.
