"""Makes the icon set Google (and phones) need, from your logo.

Run from the project folder (the one that contains `frontend`):

    pip install pillow
    python tools/make_icons.py

Reads  frontend/public/anicatz-mark.png  and writes into frontend/public/:
    favicon.ico          (16, 32, 48 px)
    favicon-48x48.png    <- the one Google uses for search results (must be a multiple of 48)
    icon-192.png         (Android / PWA, also a multiple of 48)
    icon-512.png         (PWA install icon)
    apple-touch-icon.png (180 px, iPhone home screen)
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "frontend" / "public" / "anicatz-mark.png"
OUT = ROOT / "frontend" / "public"

BG = (15, 14, 36, 255)  # #0f0e24, your dark brand colour: the icon stays readable on light AND dark pages
PAD = 0.18  # empty margin around the logo; Google crops favicons to a circle, so the logo must not touch the edge


def tile(size: int) -> Image.Image:
    logo = Image.open(SRC).convert("RGBA")
    inner = int(size * (1 - 2 * PAD))
    logo.thumbnail((inner, inner), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), BG)
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Can't find {SRC}. Put your logo there (or edit SRC at the top of this file).")

    for name, size in [
        ("favicon-48x48.png", 48),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
        ("apple-touch-icon.png", 180),
    ]:
        tile(size).save(OUT / name, optimize=True)
        print("wrote", OUT / name, f"({size}x{size})")

    tile(256).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
    print("wrote", OUT / "favicon.ico", "(16, 32, 48)")


if __name__ == "__main__":
    main()