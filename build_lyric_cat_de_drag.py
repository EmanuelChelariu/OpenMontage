#!/usr/bin/env python3
"""
Ken Burns lyric video PILOT — Cât de drag ne este Isus
One-shot script: cover JPG (896×1200 portrait) + WAV → 1920×1080 lyric video MP4

Pipeline (100% free, no API calls):
  1. Pillow renders one transparent PNG per lyric block: dark gradient scrim +
     stroked white text — <1 second
  2. ffmpeg Ken Burns: scale portrait → 4K landscape → slow zoompan 1.0→1.3
  3. Each text PNG is looped into its own 25fps stream and alpha-faded in/out,
     so blocks cross-dissolve instead of hard-cutting
  4. H.264 + AAC output

Works without libfreetype/drawtext — uses ffmpeg `overlay` (always available).
NOTE: overlay takes [background][foreground] in that order. Swapping them makes
the still PNG the main input, which collapses the whole chain to one frame.

Usage:
    cd ~/Developer/OpenMontage
    .venv/bin/python build_lyric_cat_de_drag.py
    LYRIC_TEST_SECONDS=10 .venv/bin/python build_lyric_cat_de_drag.py   # quick check

Output: ~/Desktop/Musica IA/Cât de drag ne este Isus/cat-de-drag-lyric-video.mp4
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile

# ─────────── Paths ────────────────────────────────────────────────────────────

SONG_DIR = os.path.expanduser("~/Desktop/Musica IA/Cât de drag ne este Isus/")
AUDIO = os.path.join(SONG_DIR, "Cât de drag ne este Isus - IA.wav")
IMAGE = os.path.join(SONG_DIR, "Cât de drag ne este Isus - IA.jpg")
OUTPUT = os.path.join(SONG_DIR, "cat-de-drag-lyric-video.mp4")

# ─────────── Constants ────────────────────────────────────────────────────────

DURATION = 233.6
TEST_SECONDS = (
    float(os.environ["LYRIC_TEST_SECONDS"])
    if os.environ.get("LYRIC_TEST_SECONDS")
    else None
)
FPS = 25
TOTAL_FRAMES = int(DURATION * FPS)  # 5840
OUT_W, OUT_H = 1920, 1080

FONT_PATH = "/System/Library/Fonts/Supplemental/Georgia.ttf"
FONT_SIZE = 50
TITLE_SIZE = 68
LINE_GAP = 76           # px between the two lyric lines
STROKE_WIDTH = 4        # black outline around glyphs — carries contrast on any photo
SHADOW_OFFSET = 4
SHADOW_ALPHA = 190
FADE = 0.6              # seconds of alpha fade in/out per block

# ─────────── Lyric blocks ─────────────────────────────────────────────────────
# (start_sec, end_sec, [line1, line2])
# Manual timing: 4s intro + 3 verses × ~75.5s + outro ≈ 233.6s

BLOCKS: list[tuple[float, float, list[str]]] = [
    (0, 4, ["Cât de drag ne este Isus"]),
    (4, 42, [
        "Cât de drag ne este Isus care la cer S-a-nălțat,",
        "Cu Dumnezeu ne-a-mpăcat și pentru noi S-a rugat.",
    ]),
    (42, 79, [
        "Cine-ar putea să ne spună câtă pierdere-am avea,",
        "Când spre El nu ne-am întoarce și rugând L-am căuta.",
    ]),
    (79, 117, [
        "Când vrăjmașul ne apasă și-n strâmtorări ne aflăm",
        "Către El, ce nu ne lasă, rugăciune să-ndreptăm.",
    ]),
    (117, 155, [
        "Căci atunci a Lui iubire va fi pururea cu noi",
        "El ne-ascultă rugăciunea și ne scapă din nevoi.",
    ]),
    (155, 193, [
        "Iar când ne vin gânduri grele numai la El s-alergăm.",
        "Isus ajutor trimite către El dacă strigăm.",
    ]),
    (193, 231, [
        "Părăsiți fiind de prieteni și cu sufletu-ntristat,",
        "O, atunci Isus ne este ajutorul așteptat.",
    ]),
]

# ─────────── Pillow overlay generator ─────────────────────────────────────────

def _scrim(is_title: bool):
    """Dark gradient band that lifts text off the photo.

    Title: soft horizontal band around the centre.
    Verses: bottom-up gradient, transparent at 52% height, near-opaque at the foot.
    """
    import numpy as np
    from PIL import Image

    ys = np.arange(OUT_H, dtype=np.float32)
    if is_title:
        profile = np.clip(1.0 - np.abs(ys - OUT_H * 0.5) / (OUT_H * 0.24), 0.0, 1.0)
        alpha = (profile ** 0.75) * 175.0
    else:
        start = OUT_H * 0.52
        profile = np.clip((ys - start) / (OUT_H - start), 0.0, 1.0)
        alpha = (profile ** 0.9) * 205.0

    rgba = np.zeros((OUT_H, OUT_W, 4), dtype=np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)[:, None]
    return Image.fromarray(rgba, "RGBA")


def generate_overlays(tmp_dir: str) -> list[str]:
    """One transparent PNG per lyric block: scrim + stroked white text."""
    from PIL import ImageDraw, ImageFont

    try:
        font_main = ImageFont.truetype(FONT_PATH, FONT_SIZE)
        font_title = ImageFont.truetype(FONT_PATH, TITLE_SIZE)
    except OSError as e:
        sys.exit(f"Font load failed: {e}\nPath: {FONT_PATH}")

    paths: list[str] = []
    for idx, (start, end, lines) in enumerate(BLOCKS):
        is_title = start == 0
        font = font_title if is_title else font_main

        img = _scrim(is_title)
        draw = ImageDraw.Draw(img)

        for i, line in enumerate(lines):
            bbox = draw.textbbox((0, 0), line, font=font, stroke_width=STROKE_WIDTH)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            x = (OUT_W - text_w) // 2
            y = (OUT_H - text_h) // 2 if is_title else int(OUT_H * 0.70) + i * LINE_GAP

            draw.text(
                (x + SHADOW_OFFSET, y + SHADOW_OFFSET),
                line, font=font, fill=(0, 0, 0, SHADOW_ALPHA),
                stroke_width=STROKE_WIDTH, stroke_fill=(0, 0, 0, SHADOW_ALPHA),
            )
            draw.text(
                (x, y), line, font=font, fill=(255, 255, 255, 255),
                stroke_width=STROKE_WIDTH, stroke_fill=(0, 0, 0, 235),
            )

        out_path = os.path.join(tmp_dir, f"text_{idx:02d}.png")
        img.save(out_path, "PNG")
        paths.append(out_path)
        head = lines[0][:40] + ("…" if len(lines[0]) > 40 else "")
        print(f"  overlay {idx}: [{start}-{end}s] {head}")

    return paths


# ─────────── ffmpeg filter builder ────────────────────────────────────────────

def _n(t: float) -> str:
    return f"{t:.2f}"


def build_filter() -> str:
    """filter_complex for: [0]=cover, [1..7]=text PNGs, [8]=audio."""
    # Portrait 896×1200 → 3840 wide → centre-crop to 4K landscape → zoompan → 1080p
    kb = (
        "scale=3840:-2,"
        "crop=3840:2160:0:(ih-2160)/2,"
        f"zoompan=z='min(zoom+0.00005\\,1.3)'"
        f":x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
        f":d={TOTAL_FRAMES}:s={OUT_W}x{OUT_H}:fps={FPS}"
    )
    parts = [f"[0:v]{kb}[bg]"]

    # Each PNG is a looped 25fps stream so alpha fades can run on real timestamps.
    for i, (start, end, _) in enumerate(BLOCKS):
        parts.append(
            f"[{i + 1}:v]format=rgba,"
            f"fade=t=in:st={_n(start)}:d={_n(FADE)}:alpha=1,"
            f"fade=t=out:st={_n(max(end - FADE, start + FADE))}:d={_n(FADE)}:alpha=1"
            f"[t{i}]"
        )

    prev = "bg"
    for i, (start, end, _) in enumerate(BLOCKS):
        label = "vout" if i == len(BLOCKS) - 1 else f"v{i}"
        # enable window padded by the fade so the dissolve is not clipped
        parts.append(
            f"[{prev}][t{i}]overlay=x=0:y=0"
            f":enable='between(t\\,{_n(max(start - FADE, 0))}\\,{_n(end + FADE)})'"
            f"[{label}]"
        )
        prev = label

    return ";".join(parts)


# ─────────── Main ─────────────────────────────────────────────────────────────

def main() -> None:
    for path, label in [(AUDIO, "WAV audio"), (IMAGE, "Cover image"), (FONT_PATH, "Font")]:
        if not os.path.exists(path):
            sys.exit(f"Missing {label}: {path}")

    final = OUTPUT.replace(".mp4", "_test.mp4") if TEST_SECONDS else OUTPUT
    seconds = TEST_SECONDS or DURATION

    print("─" * 60)
    print(f"Output  : {final}")
    print(f"Duration: {seconds}s  ({TOTAL_FRAMES} frames of Ken Burns @ {FPS}fps)")
    print(f"Blocks  : {len(BLOCKS)}")
    print("─" * 60)

    with tempfile.TemporaryDirectory(prefix="lyric_overlay_") as tmp:
        print("Rendering text overlays with Pillow…")
        overlay_paths = generate_overlays(tmp)

        cmd: list[str] = ["ffmpeg", "-y"]
        cmd += ["-loop", "1", "-framerate", str(FPS), "-i", IMAGE]
        for p in overlay_paths:
            cmd += ["-loop", "1", "-framerate", str(FPS), "-i", p]
        cmd += ["-i", AUDIO]

        cmd += [
            "-filter_complex", build_filter(),
            "-map", "[vout]", "-map", f"{1 + len(overlay_paths)}:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20",
            "-c:a", "aac", "-b:a", "192k",
            "-t", str(seconds),
            "-pix_fmt", "yuv420p",
            final,
        ]

        print("Running ffmpeg…")
        result = subprocess.run(cmd)

    print("─" * 60)
    if result.returncode != 0:
        sys.exit(f"✗  ffmpeg exited {result.returncode}")

    size_mb = os.path.getsize(final) / 1_000_000
    print(f"✓  Done — {final} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
