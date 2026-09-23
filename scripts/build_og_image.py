"""Renders the social preview (public/og.png) and the touch icon.

    python scripts/build_og_image.py
"""

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"

BARS = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"]
RED = (255, 43, 43)
GREEN = (31, 224, 106)


def cond(size):
    f = ImageFont.truetype(str(FONTS / "bahnschrift.ttf"), size)
    try:
        f.set_variation_by_name("Bold SemiCondensed")
    except Exception:
        pass
    return f


def mono(size, bold=False):
    return ImageFont.truetype(str(FONTS / ("consolab.ttf" if bold else "consola.ttf")), size)


def og():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), "#000")
    glow = Image.new("RGB", (W, H), "#000")
    gd = ImageDraw.Draw(glow)
    gd.ellipse((-200, 60, 700, 700), fill=(70, 6, 6))
    img = Image.blend(img, glow.filter(ImageFilter.GaussianBlur(120)), 1)
    d = ImageDraw.Draw(img)

    bw = W / len(BARS)
    for i, c in enumerate(BARS):
        d.rectangle((i * bw, 0, (i + 1) * bw, 10), fill=c)

    d.text((64, 58), "MCR-01 · MASTER CONTROL ROOM", font=mono(22), fill="#8d97a5")
    d.text((64, 110), "ARIEL", font=cond(150), fill="#ffffff")
    d.text((64, 250), "GRELA", font=cond(150), fill=RED)
    d.rectangle((68, 408, 150, 414), fill=RED)
    d.text((64, 432), "Media Technology · Streaming Operations", font=cond(38), fill="#e8edf2")
    d.text((64, 478), "Implementation & Automation", font=cond(38), fill="#aab4c0")
    d.text((64, 556), "DISNEY STREAMING · ESPN · LVP — BUENOS AIRES", font=mono(20), fill="#6d7a89")

    # Mini multiviewer.
    x0, y0, tw, th, gap = 700, 150, 105, 60, 12
    tiles = ["#ffb000", "#ff3b3b", "#ff4fa3", "#35d0ff", "#8b7bff", "#20e070", "#39ff88", "#ffffff"]
    d.rectangle((x0, y0 - 104, x0 + 4 * tw + 3 * gap, y0 - 14), outline=RED, width=4, fill="#070304")
    d.text((x0 + 16, y0 - 88), "PGM", font=cond(34), fill=RED)
    d.text((x0 + 16, y0 - 50), "ARIEL GRELA · ON AIR", font=mono(18), fill="#e8edf2")
    d.ellipse((x0 + 4 * tw + 3 * gap - 70, y0 - 84, x0 + 4 * tw + 3 * gap - 22, y0 - 36), fill=RED)
    for i, c in enumerate(tiles):
        col, row = i % 4, i // 4
        x = x0 + col * (tw + gap)
        y = y0 + row * (th + gap + 22)
        d.rectangle((x, y, x + tw, y + th), fill="#0b0d11")
        r, g, b = Image.new("RGB", (1, 1), c).getpixel((0, 0))
        for k in range(th):
            a = 0.55 * (1 - k / th)
            d.line((x, y + k, x + tw, y + k), fill=(int(r * a), int(g * a), int(b * a)))
        d.rectangle((x, y + th, x + tw, y + th + 20), fill="#000")
        d.rectangle((x, y + th, x + 20, y + th + 20), fill=GREEN if i == 1 else "#2b3138")
        d.text((x + 6, y + th + 1), str(i + 1), font=cond(17), fill="#000" if i == 1 else "#e8edf2")
        if i == 1:
            d.rectangle((x - 2, y - 2, x + tw + 2, y + th + 22), outline=GREEN, width=3)

    # Switcher keys.
    ky = 418
    for i in range(8):
        x = x0 + i * 55
        d.rounded_rectangle((x, ky, x + 44, ky + 34), radius=5, fill=RED if i == 1 else "#1a1f26")
    d.rounded_rectangle((x0, ky + 50, x0 + 120, ky + 88), radius=5, fill="#c9ced6")
    d.text((x0 + 38, ky + 54), "CUT", font=cond(28), fill="#111")
    d.rounded_rectangle((x0 + 134, ky + 50, x0 + 254, ky + 88), radius=5, fill="#b01818")
    d.text((x0 + 160, ky + 54), "AUTO", font=cond(28), fill="#fff")

    # Scanlines.
    over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    for y in range(0, H, 3):
        od.line((0, y, W, y), fill=(0, 0, 0, 40))
    img = Image.alpha_composite(img.convert("RGBA"), over).convert("RGB")
    img.save(ROOT / "public" / "og.png", optimize=True)


def touch_icon():
    S = 180
    img = Image.new("RGB", (S, S), "#000")
    d = ImageDraw.Draw(img)
    bw = S / len(BARS)
    for i, c in enumerate(BARS):
        d.rectangle((i * bw, 0, (i + 1) * bw, 16), fill=c)
    f = cond(92)
    tw = d.textlength("AG", font=f)
    d.text(((S - tw) / 2, 42), "AG", font=f, fill="#fff")
    d.ellipse((S - 44, S - 44, S - 16, S - 16), fill=RED)
    img.save(ROOT / "public" / "apple-touch-icon.png", optimize=True)


if __name__ == "__main__":
    og()
    touch_icon()
    print("wrote public/og.png and public/apple-touch-icon.png")
