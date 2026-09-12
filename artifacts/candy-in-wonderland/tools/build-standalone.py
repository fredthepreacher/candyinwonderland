#!/usr/bin/env python3
"""
Fold the production build into ONE self-contained .html file.

Every PNG becomes a data: URI inside the JS bundle, the CSS and JS go inline,
and the result needs no server and no network — you can mail it, drop it on a
USB stick, or publish it as a link to open on a phone.

Run `pnpm build` first, then:

    python tools/build-standalone.py

The two full-frame background plates are re-encoded as JPEG for this build only.
They are 3.4 MB of the payload as PNG, and base64 inflates everything by a third;
they are opaque, so nothing is lost but a couple of hundred KB of file size.
"""
import os, base64, io, glob
from PIL import Image

DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'dist', 'public')
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'candy-in-wonderland-standalone.html')

js  = open(glob.glob(f'{DIST}/assets/index-*.js')[0], encoding='utf-8').read()
css = open(glob.glob(f'{DIST}/assets/index-*.css')[0], encoding='utf-8').read()

# Opaque full-frame plates are re-encoded as JPEG for this build only: they are
# 3.4 MB of the payload as PNG and base64 inflates everything by a third.
JPEG = {'backgrounds/courtyard.png': 82, 'backgrounds/starfield.png': 78}

def data_uri(path, rel):
    q = JPEG.get(rel)
    if q:
        buf = io.BytesIO()
        Image.open(path).convert('RGB').save(buf, 'JPEG', quality=q, optimize=True, progressive=True)
        return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(), len(buf.getvalue())
    raw = open(path, 'rb').read()
    return 'data:image/png;base64,' + base64.b64encode(raw).decode(), len(raw)

total_before = total_after = 0
replaced = missed = 0
for path in sorted(glob.glob(f'{DIST}/assets/**/*.png', recursive=True)):
    rel = os.path.relpath(path, f'{DIST}/assets').replace(os.sep, '/')
    ref = f'/assets/{rel}'
    if ref not in js:
        missed += 1
        continue
    uri, nbytes = data_uri(path, rel)
    total_before += os.path.getsize(path)
    total_after  += nbytes
    js = js.replace(f'"{ref}"', f'"{uri}"').replace(f"'{ref}'", f"'{uri}'")
    replaced += 1

print(f'  inlined {replaced} assets ({missed} present but unreferenced)')
print(f'  image payload {total_before//1024} KB -> {total_after//1024} KB before base64')

html = f'''<title>Candy in Wonderland</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
html, body {{ height: 100%; margin: 0; background: #05010f; overscroll-behavior: none; }}
#root {{ height: 100%; }}
{css}
</style>
<div id="root"></div>
<script type="module">
{js}
</script>
'''
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8').write(html)
print(f'  wrote {OUT}  ({os.path.getsize(OUT)//1024/1024:.2f} MB)')
