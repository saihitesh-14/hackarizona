"""Traces the "HACK ARIZONA" wordmark (src/partials/wordmark.html, used in the header and the Home hero) from the official lockup Sai supplied
on 27 Oct 2026 (refs/brand/hackaz-lockup-white.webp: white on transparent, 2000 x 667). The text row is found by
its alpha, upscaled, thresholded and traced with Potrace, and the outline goes inline as one path in currentColor.
Needs: pip install potracer numpy pillow.   Run: python3 scripts/trace-wordmark.py"""
import re
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

WEB = Path(__file__).resolve().parent.parent
SOURCE = WEB / 'refs/brand/hackaz-lockup-white.webp'
PARTIAL = WEB / 'src/partials/wordmark.html'
TEXT_LEFT = 540  # px: the text block starts right of the circle mark and the divider
UPSCALE = 3  # trace a larger bitmap for smoother curves

alpha = np.asarray(Image.open(SOURCE).convert('RGBA'))[:, :, 3]
inked = alpha[:, TEXT_LEFT:] > 40
rows = np.flatnonzero(inked.any(axis=1))
# Bands of consecutive inked rows: the first is THE UNIVERSITY OF ARIZONA, the second HACK ARIZONA.
bands = np.split(rows, np.flatnonzero(np.diff(rows) > 1) + 1)
assert len(bands) == 2, f'expected two text rows, found {len(bands)}'
top, bottom = bands[1][0], bands[1][-1] + 1
cols = TEXT_LEFT + np.flatnonzero(inked[top:bottom].any(axis=0))
left, right = cols[0], cols[-1] + 1
crop = Image.fromarray(alpha[top:bottom, left:right]).resize(((right - left) * UPSCALE, (bottom - top) * UPSCALE), Image.LANCZOS)
bitmap = potrace.Bitmap(np.asarray(crop) < 128)  # potracer traces the False pixels as ink
traced = bitmap.trace(turdsize=8 * UPSCALE, alphamax=0.75, opticurve=True, opttolerance=0.2)

def pt(p):
    return f'{p.x / UPSCALE:.2f} {p.y / UPSCALE:.2f}'.replace('.00', '')

parts = []
for curve in traced:
    parts.append(f'M{pt(curve.start_point)}')
    for seg in curve.segments:
        parts.append(f'L{pt(seg.c)}L{pt(seg.end_point)}' if seg.is_corner else f'C{pt(seg.c1)} {pt(seg.c2)} {pt(seg.end_point)}')
    parts.append('Z')
width, height = right - left, bottom - top
svg = (f'<svg class="wordmark" viewBox="0 0 {width} {height}" aria-hidden="true" focusable="false">'
       f'<path fill="currentColor" fill-rule="evenodd" d="{"".join(parts)}"/></svg>')

partial = PARTIAL.read_text(encoding='utf-8')
start, end = '<!-- wordmark:start -->', '<!-- wordmark:end -->'
assert start in partial and end in partial, 'wordmark markers not found in the partial'
PARTIAL.write_text(re.sub(f'{re.escape(start)}.*?{re.escape(end)}', lambda _: start + svg + end, partial, flags=re.S), encoding='utf-8')
print(f'wordmark: {width} x {height} px from the lockup, {len(traced)} contours, {len(svg)} bytes')
