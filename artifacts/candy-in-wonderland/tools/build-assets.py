#!/usr/bin/env python3
"""
Candy in Wonderland — asset build pipeline.

Source of truth:  design/candy_in_wonderland_asset_package/   (raw art, 1-3 MB each)
Output:           artifacts/candy-in-wonderland/public/assets/ (game-ready, alpha-cut, downscaled)

Run from anywhere:  python tools/build-assets.py

What it does per asset:
  1. cuts the baked white/grey matte (border-connected flood fill, so interior
     whites — shirt collars, magnifier glass, highlights — are preserved)
  2. un-multiplies the white matte out of the anti-aliased edge so no white halo remains
  3. trims to the alpha bounding box (kills the invisible padding that made
     sprites render small and float above their shadow)
  4. downscales to a sane runtime size and re-encodes

Re-run this after dropping new art into design/.  Do not hand-edit public/assets.
"""
import os, sys, json
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))          # artifacts/candy-in-wonderland
REPO = os.path.dirname(os.path.dirname(ROOT))                                # repo root
SRC  = os.path.join(REPO, 'design', 'candy_in_wonderland_asset_package')
OUT  = os.path.join(ROOT, 'public', 'assets')

# ── matte removal ────────────────────────────────────────────────────────────

def _border_connected(mask):
    """True where `mask` is reachable from the image border (4-connected)."""
    lbl, n = ndimage.label(mask)
    if n == 0:
        return np.zeros_like(mask, dtype=bool)
    edge = np.concatenate([lbl[0, :], lbl[-1, :], lbl[:, 0], lbl[:, -1]])
    keep = np.unique(edge)
    keep = keep[keep != 0]
    return np.isin(lbl, keep)

def cut_matte(im, light=225, sat=28):
    """Return RGBA with the border-connected light matte removed and edges un-matted."""
    im = im.convert('RGBA')
    arr = np.array(im).astype(np.int16)
    rgb, a0 = arr[..., :3], arr[..., 3]

    # Art that already ships real transparency is left alone.
    if (a0 < 250).mean() > 0.05:
        return im

    mn = rgb.min(axis=2)
    mx = rgb.max(axis=2)
    matte = (mn >= light) & ((mx - mn) <= sat)
    outside = _border_connected(matte)
    if not outside.any():
        return im

    alpha = np.where(outside, 0.0, 1.0)
    # Feather one pixel so the cut edge is not a hard staircase, then pull the
    # threshold in slightly so leftover matte pixels go fully transparent.
    alpha = ndimage.gaussian_filter(alpha, 0.7)
    alpha = np.clip((alpha - 0.22) / 0.56, 0.0, 1.0)

    # Un-matte: observed = fg*a + matte*(1-a).  Solve for fg on partial pixels
    # so the anti-aliased rim stops carrying a white halo.
    matte_rgb = np.array([255.0, 255.0, 255.0])
    a3 = alpha[..., None]
    partial = (alpha > 0.02) & (alpha < 0.98)
    fg = rgb.astype(np.float64)
    with np.errstate(divide='ignore', invalid='ignore'):
        un = (fg - matte_rgb * (1.0 - a3)) / np.maximum(a3, 1e-3)
    fg = np.where(partial[..., None], np.clip(un, 0, 255), fg)

    out = np.dstack([fg, alpha * 255.0]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def trim(im, pad=2):
    """Crop to the alpha bounding box (with a couple of px of breathing room)."""
    if im.mode != 'RGBA':
        return im
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return im
    x0, x1 = max(0, xs.min() - pad), min(im.width,  xs.max() + 1 + pad)
    y0, y1 = max(0, ys.min() - pad), min(im.height, ys.max() + 1 + pad)
    return im.crop((x0, y0, x1, y1))

def fit_height(im, h):
    if im.height <= h:
        return im
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)

def fit_width(im, w):
    if im.width <= w:
        return im
    return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)

def square_portrait(im, size=256):
    """Head-and-shoulders square crop taken from the top of the visible content."""
    im = im.convert('RGBA')
    a = np.array(im)[..., 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return fit_height(im, size)
    x0, x1, y0 = xs.min(), xs.max() + 1, ys.min()
    cw = x1 - x0
    side = min(max(cw, 32), im.height - y0) if im.height - y0 > 0 else cw
    cx = (x0 + x1) // 2
    left = int(np.clip(cx - side // 2, 0, max(0, im.width - side)))
    top  = int(np.clip(y0 - side * 0.04, 0, max(0, im.height - side)))
    return im.crop((left, top, left + side, top + side)).resize((size, size), Image.LANCZOS)

# ── build table ──────────────────────────────────────────────────────────────
# (source, destination, mode, size)
#   sprite   — matte cut, trimmed, height-capped
#   portrait — matte cut, square head crop
#   flat     — matte cut, width-capped, not trimmed (UI panels keep their frame)
#   opaque   — no matte cut (backgrounds), width-capped

JOBS = [
    # ── Candy ────────────────────────────────────────────────────────────────
    ('characters/main_character/candy_front_portrait_or_sprite.png', 'characters/candy_front.png', 'sprite', 384),
    ('characters/main_character/candy_reference_sprite.png',         'characters/candy_back.png',  'sprite', 384),
    ('characters/portraits/candy_dialogue_portrait.png',             'portraits/candy_portrait.png', 'portrait', 256),

    # ── NPCs ─────────────────────────────────────────────────────────────────
    # Witness  = the young detective in the flat cap
    # Scholar  = the elderly detective with magnifier + field book
    #            (shipped mis-named as "candy_directional_or_walking_reference")
    # Wanderer = the girl in the blue dress
    #            (shipped mis-named as "candy_sprite_sheet")
    ('characters/npcs/witness_full_body_sprite.png',                  'npcs/witness.png',        'sprite', 320),
    ('characters/main_character/candy_directional_or_walking_reference.png', 'npcs/scholar.png',  'sprite', 320),
    ('characters/main_character/candy_sprite_sheet.png',              'npcs/wanderer.png',       'sprite', 320),
    ('characters/npcs/witness_alt_full_body_sprite.png',              'npcs/detective_alt.png',  'sprite', 320),

    ('characters/portraits/witness_dialogue_portrait.png',            'portraits/witness_portrait.png',  'portrait', 256),
    ('characters/main_character/candy_directional_or_walking_reference.png', 'portraits/scholar_portrait.png',  'portrait', 256),
    ('characters/main_character/candy_sprite_sheet.png',              'portraits/wanderer_portrait.png', 'portrait', 256),
    ('characters/npcs/witness_alt_full_body_sprite.png',              'portraits/detective_portrait.png','portrait', 256),

    # ── Bosses ───────────────────────────────────────────────────────────────
    ('bosses/boss_01_guardian.png',          'boss/boss_guardian.png',   'sprite', 512),
    ('bosses/boss_02_aristocrat.png',        'boss/boss_aristocrat.png', 'sprite', 512),
    ('bosses/boss_03_sorceress.png',         'boss/boss_sorceress.png',  'sprite', 512),
    ('bosses/boss_04_sorceress_variant.png', 'boss/boss_warden.png',     'sprite', 512),

    # ── Props / UI / backgrounds ─────────────────────────────────────────────
    ('props/bench.png',                      'props/bench.png',          'sprite', 192),
    ('ui/truth_meter_panel.png',             'ui/truth_meter.png',       'flat',   512),
    ('ui/ornate_ui_frame.png',               'ui/clues_frame.png',       'flat',   512),
    ('menu/assets/03_candy_character_badge.png', 'ui/menu/candy_badge.png','flat',  320),
    ('backgrounds/enchanted_courtyard_of_secrets.png', 'backgrounds/courtyard.png', 'opaque', 1100),
    ('backgrounds/starry_purple_night_sky.png',        'backgrounds/starfield.png', 'opaque', 1280),
]

def extract_heart(size=64):
    """
    Pull a single heart out of the TRUTH METER plate.

    The plate is a static mockup — five hearts baked into one image — so it cannot
    drive a live HP display on its own. Cutting one heart out of it turns that
    mockup into a real HUD icon: the HUD stamps PLAYER_MAX_HP of them and greys
    out the empty ones, so the meter is the game's own art AND still accurate.
    """
    src = os.path.join(SRC, 'ui', 'truth_meter_panel.png')
    if not os.path.exists(src):
        return None
    im = cut_matte(Image.open(src))
    a = np.array(im)
    rgb = a[..., :3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    red = (a[..., 3] > 64) & (r > 120) & (r > g * 1.7) & (r > b * 1.7)
    lbl, n = ndimage.label(red)
    if n == 0:
        return None
    sizes = ndimage.sum(red, lbl, range(1, n + 1))
    biggest = int(np.argmax(sizes)) + 1
    ys, xs = np.where(lbl == biggest)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad),
           min(im.width, xs.max() + 1 + pad), min(im.height, ys.max() + 1 + pad))
    heart = im.crop(box)
    dst = os.path.join(OUT, 'ui', 'heart.png')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    fit_height(trim(heart), size).save(dst, optimize=True)
    return dst


def main():
    before = after = 0
    report = []
    for src_rel, dst_rel, mode, size in JOBS:
        src = os.path.join(SRC, src_rel)
        dst = os.path.join(OUT, dst_rel)
        if not os.path.exists(src):
            print(f'  MISSING  {src_rel}')
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        src_bytes = os.path.getsize(src)
        im = Image.open(src)

        if mode == 'opaque':
            im = fit_width(im.convert('RGB'), size)
        elif mode == 'portrait':
            im = square_portrait(cut_matte(im), size)
        elif mode == 'flat':
            im = fit_width(trim(cut_matte(im)), size)
        else:  # sprite
            im = fit_height(trim(cut_matte(im)), size)

        im.save(dst, optimize=True)
        dst_bytes = os.path.getsize(dst)
        before += src_bytes; after += dst_bytes
        report.append((dst_rel, im.size, src_bytes, dst_bytes))
        print(f'  {dst_rel:42s} {im.size[0]:>5}x{im.size[1]:<5} '
              f'{src_bytes//1024:>5} KB -> {dst_bytes//1024:>4} KB')

    heart = extract_heart()
    if heart:
        after += os.path.getsize(heart)
        print(f"  {'ui/heart.png':42s} cut from the TRUTH METER plate "
              f'{os.path.getsize(heart)//1024:>5} KB')

    print(f'\n  {len(report) + (1 if heart else 0)} assets   {before//1024} KB -> {after//1024} KB '
          f'({100 - after*100//max(before,1)}% smaller)')

if __name__ == '__main__':
    main()
