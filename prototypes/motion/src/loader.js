/*
 * Logo draw-on.
 * The exact traced mark is revealed through masks whose strokes follow the centre lines,
 * so the final frame is the logo itself, untouched. One idea drives everything: a signal
 * leaves the base of the trunk, and every part of the mark appears when the signal reaches it.
 *
 *   0.00 to 0.70s   the disc fades in and the white ring draws round from the bottom
 *   0.35 to 1.45s   the signal grows the trunk, the arms and the pads
 *   1.45 to 2.20s   a red pulse runs up the traces and each pad flashes as it arrives
 */

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createLogoDrawOn(svg)
{
    const q = (selector) => svg.querySelector(selector);
    const disc = q('[data-part="disc"]');
    const ringArcs = [...svg.querySelectorAll('[data-ring-arc]')];
    const pulseDots = [...svg.querySelectorAll('[data-pulse]')];
    const flashes = Object.fromEntries([...svg.querySelectorAll('[data-flash]')].map((el) => [el.dataset.flash, el]));

    // Each revealing stroke knows where the signal reaches it (start) and how long it is.
    const trunk = q('[data-reveal="trunk"]');
    const armLeft = q('[data-reveal="arm-left"]');
    const armRight = q('[data-reveal="arm-right"]');
    const trunkLength = trunk.getTotalLength();
    const leftLength = armLeft.getTotalLength();
    const rightLength = armRight.getTotalLength();

    // Distance along the trunk (from its base) at which each arm branches off.
    const baseY = 1145;
    const leftStart = baseY - 699.2;
    const rightStart = baseY - 886.5;

    const strokes =
    [
        { el: trunk, start: 0, length: trunkLength },
        { el: armLeft, start: leftStart, length: leftLength },
        { el: armRight, start: rightStart, length: rightLength }
    ];
    const padStart = { top: trunkLength, left: leftStart + leftLength, right: rightStart + rightLength };
    svg.querySelectorAll('[data-pad-arc]').forEach((el) =>
    {
        strokes.push({ el, start: padStart[el.dataset.padArc], length: el.getTotalLength() });
    });
    const maxDistance = Math.max(...strokes.map((s) => s.start + s.length));

    const branches =
    [
        { path: trunk, start: 0, length: trunkLength, pad: 'top' },
        { path: armLeft, start: leftStart, length: leftLength, pad: 'left' },
        { path: armRight, start: rightStart, length: rightLength, pad: 'right' }
    ];
    const pulseEnd = Math.max(...branches.map((b) => b.start + b.length));

    strokes.forEach((s) =>
    {
        s.el.setAttribute('pathLength', '1');
        s.el.style.strokeDasharray = '1 1';
    });
    ringArcs.forEach((el) =>
    {
        el.setAttribute('pathLength', '1');
        el.style.strokeDasharray = '1 1';
    });

    let frame = 0;
    let startTime = 0;
    const masked = [...svg.querySelectorAll('[data-masked]')];

    function render(t)
    {
        // Once everything has been revealed, drop the masks so the final frame is the plain logo.
        const complete = t >= 2.25;
        masked.forEach((el) =>
        {
            if (complete)
            {
                el.removeAttribute('mask');
            }
            else
            {
                el.setAttribute('mask', el.dataset.masked);
            }
        });

        // Disc and ring.
        const discT = easeOutCubic(clamp01(t / 0.6));
        disc.style.opacity = String(discT);
        disc.style.transform = `scale(${0.94 + 0.06 * discT})`;
        const ringT = easeOutCubic(clamp01(t / 0.7));
        ringArcs.forEach((el) =>
        {
            el.style.strokeDashoffset = String(1 - ringT);
            el.style.visibility = ringT > 0.001 ? 'visible' : 'hidden';
        });

        // The growing signal.
        const growT = easeOutCubic(clamp01((t - 0.35) / 1.1));
        const reach = growT * maxDistance;
        strokes.forEach((s) =>
        {
            const fraction = clamp01((reach - s.start) / s.length);
            s.el.style.strokeDashoffset = String(1 - fraction);
            s.el.style.visibility = fraction > 0.001 ? 'visible' : 'hidden';
        });

        // The pulse: one dot per branch, travelling together from the base.
        const pulseT = clamp01((t - 1.45) / 0.75);
        const travelled = easeInOutSine(pulseT) * pulseEnd;
        branches.forEach((b, i) =>
        {
            const dot = pulseDots[i];
            const along = travelled - b.start;
            const visible = pulseT > 0 && pulseT < 1 && along > 0 && along < b.length;
            if (visible)
            {
                const p = b.path.getPointAtLength(along);
                dot.setAttribute('cx', p.x.toFixed(1));
                dot.setAttribute('cy', p.y.toFixed(1));
            }
            dot.style.opacity = visible ? '1' : '0';

            // Pad flash: bright on arrival, then fades.
            const arrival = 1.45 + 0.75 * inverseEase((b.start + b.length) / pulseEnd);
            const since = t - arrival;
            const flash = since < 0 ? 0 : Math.exp(-since / 0.28);
            flashes[b.pad].style.opacity = flash.toFixed(3);
        });
    }

    // Time at which easeInOutSine reaches a given fraction.
    function inverseEase(fraction)
    {
        return Math.acos(1 - 2 * clamp01(fraction)) / Math.PI;
    }

    function tick(now)
    {
        const t = (now - startTime) / 1000;
        render(t);
        if (t < 3)
        {
            frame = requestAnimationFrame(tick);
        }
    }

    return {
        play()
        {
            cancelAnimationFrame(frame);
            startTime = performance.now();
            frame = requestAnimationFrame(tick);
        },
        showFinal()
        {
            cancelAnimationFrame(frame);
            render(10);
        },
        renderAt(t)
        {
            cancelAnimationFrame(frame);
            render(t);
        }
    };
}
