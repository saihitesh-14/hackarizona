# Motion prototypes

Two pieces for the new Hack Arizona site, built from the mark's measured geometry.

- `hackaz-motion-prototype.html`: open it in a browser. Everything is inside this one file.
- `src/geometry.js`: the logo's measured centre lines, widths, pads and gradient.
- `src/loader.js`: the logo draw-on (loader idea).
- `src/saguaro.js`: the 3D circuit saguaro (three.js).
- `src/main.js`: wires the page controls.
- `index.template.html` and `build.mjs`: the page and the build that inlines the script.

## Preview

```sh
open ~/Desktop/HackAZ/website/prototypes/motion/hackaz-motion-prototype.html
```

## Rebuild after editing

```sh
cd ~/Desktop/HackAZ/website/prototypes/motion
npm install
npm run build
```

## Checked

- The traced logo matches the PNG (mean difference 1.1 of 255; white-area overlap 99.1%).
- The draw-on ends on the exact logo (pixel diff against the static mark).
- Light and dark themes, a phone width, reduced motion (starts paused, shows final states), drag, flick and click, with no console errors.
