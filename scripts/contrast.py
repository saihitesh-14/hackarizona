#!/usr/bin/env python3
"""Check text contrast for the light and dark token sets in a stylesheet.

    python3 contrast.py path/to/styles.css

Reads the `:root{...}` block that defines --paper and the `:root[data-theme='dark']{...}` block,
then checks every text role against every surface role (WCAG AA needs 4.5:1 for body text), and
the on-fill roles against their fills. Exits with status 1 when any pair fails, so it can gate a
build. Only hex values are understood; give tokens hex values, or check other syntaxes by hand.
"""
import re
import sys

TEXT_ROLES = ['ink', 'text-strong', 'accent-ink', 'muted', 'muted-2', 'accent']
SURFACE_ROLES = ['paper', 'card', 'panel', 'tint', 'node']
FILL_PAIRS = [('on-accent', 'accent-fill'), ('on-fill', 'brand-fill'), ('paper', 'ink')]


def hex_to_rgb(value):
    value = value.lstrip('#')
    if len(value) in (3, 4):
        value = ''.join(c * 2 for c in value[:3])
    return [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def luminance(value):
    channels = [c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4 for c in hex_to_rgb(value)]
    return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]


def ratio(a, b):
    high, low = sorted([luminance(a), luminance(b)], reverse=True)
    return (high + .05) / (low + .05)


def tokens(block):
    return {name: value for name, value in re.findall(r'--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\b', block)}


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    css = open(sys.argv[1], encoding='utf-8').read()
    light_block = next((m for m in re.findall(r':root\{([^}]*)\}', css) if '--paper' in m), '')
    dark_match = re.search(r":root\[data-theme=['\"]dark['\"]\]\{([^}]*)\}", css)
    themes = {'light': tokens(light_block), 'dark': tokens(dark_match.group(1) if dark_match else '')}
    failed = False
    for theme, values in themes.items():
        if not values:
            print(f'{theme}: no hex tokens found')
            continue
        rows = []
        for text in TEXT_ROLES:
            for surface in SURFACE_ROLES:
                if text in values and surface in values:
                    rows.append((ratio(values[text], values[surface]), text, surface, 4.5))
        for text, fill in FILL_PAIRS:
            if text in values and fill in values:
                rows.append((ratio(values[text], values[fill]), text, fill, 4.5))
        rows.sort()
        print(f'\n{theme}: weakest pairs')
        for value, text, surface, need in rows[:6]:
            mark = 'ok ' if value >= need else 'LOW'
            print(f'  {mark} {value:5.2f}  --{text} on --{surface}')
        low = [row for row in rows if row[0] < row[3]]
        if low:
            failed = True
            print(f'  {len(low)} pair(s) below 4.5:1. A pair that never appears together on the page can be ignored; say so in a comment.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
