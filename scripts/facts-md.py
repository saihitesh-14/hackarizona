"""Writes src/data/facts.md from src/data/facts.json (the JSON is the source; never edit the Markdown by hand).
Run: python3 scripts/facts-md.py   (add --check to fail when facts.md is out of date instead of writing it)"""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'src' / 'data'
COLUMNS = ['id', 'statement', 'value', 'year', 'confidence', 'source', 'notes']


def cell(value):
    if value is None:
        return ''
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    return str(value).replace('|', '\\|')


def render(data):
    facts = data['facts']
    out = [
        '# Hack Arizona facts',
        '',
        f"Generated {data['generated']} from the same data as `facts.json` ({len(facts)} facts). Confidence: `confirmed-by-sai` (Sai said so), "
        "`owner-document` (Sai's files), `derived` (read from photos, filenames or capture dates), `public-web` (needs Sai's confirmation "
        'before it ships). Numbers are quoted as written; conflicts are listed, never merged.',
        '',
        f"## Conflicts ({len(data['conflicts'])})",
        '',
        *[f"- **{c['topic']}**: {c['detail']}" for c in data['conflicts']],
        '',
        f"## Unknown ({len(data['unknown'])})",
        '',
        *[f'- {u}' for u in data['unknown']],
        '',
    ]
    for topic in dict.fromkeys(f['topic'] for f in facts):
        rows = [f for f in facts if f['topic'] == topic]
        out += [f'## {topic} ({len(rows)})', '', '| ' + ' | '.join(COLUMNS) + ' |', '| ' + ' | '.join('---' for _ in COLUMNS) + ' |']
        out += ['| ' + ' | '.join(cell(f.get(c)) for c in COLUMNS) + ' |' for f in rows]
        out.append('')
    return '\n'.join(out)


if __name__ == '__main__':
    text = render(json.loads((DATA / 'facts.json').read_text(encoding='utf-8')))
    target = DATA / 'facts.md'
    if '--check' in sys.argv:
        sys.exit(0 if target.read_text(encoding='utf-8') == text else 'facts.md is out of date: run python3 scripts/facts-md.py')
    target.write_text(text, encoding='utf-8')
