#!/usr/bin/env python3
"""Micro-animazioni cutout 2.5D per creation-kids — FREE, tutto locale.

Per 8 scene con personaggi/animali: rembg ritaglia il soggetto, Remotion
renderizza sfondo (Ken Burns) + ritaglio (moto sinusoidale piccolo) con gli
stessi fade delle scene ffmpeg. I clip risultanti sostituiscono i clip_XX
Ken Burns e il video viene rimontato con la voce e la musica esistenti.

Prerequisito: build_creation_kids.py gia' eseguito (immagini, voci, musica,
clip presenti in projects/creation-kids/assets/).

Uso:
    cd ~/Developer/OpenMontage
    PATH="$PWD/.venv/bin:$PATH" .venv/bin/python animate_creation_scenes.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
WORK = ROOT / "projects" / "creation-kids" / "assets"
OUT = ROOT / "projects" / "creation-kids" / "renders" / "creation-kids.mp4"
COMPOSER = ROOT / "remotion-composer"
PUB = COMPOSER / "public" / "creation"

FPS = 30
MIN_SCENE = 5.5
LEAD = 0.35
GAP = 0.6
MUSIC_VOLUME = 0.18
N_SCENES = 18

# Zoom per scena (identico a build_creation_kids.py, indice 0-based).
ZOOMS = ["in", "out", "in", "out", "in", "out", "in", "out", "in",
         "out", "in", "in", "out", "in", "out", "in", "out", "in"]

# Scene animate: indice -> parametri del moto del ritaglio.
ANIM: dict[int, dict[str, object]] = {
    0:  {"period": 4.0, "ampY": 10, "ampX": 6, "ampRot": 1.2,
         "origin": "50% 50%"},   # colomba: fluttua
    7:  {"period": 5.0, "ampY": 8, "ampX": 10, "ampRot": 0.8,
         "origin": "50% 50%"},   # balena: deriva lenta
    8:  {"period": 3.6, "ampY": 3, "ampRot": 1.0,
         "origin": "50% 100%"},  # tucano: ondeggia sul ramo
    9:  {"period": 3.4, "ampScale": 0.015, "ampY": 2,
         "origin": "50% 100%"},  # elefanti: respiro
    10: {"period": 2.8, "ampY": 4, "ampRot": 0.5,
         "origin": "50% 100%"},  # scoiattoli: saltelli piccoli
    11: {"period": 3.8, "ampScale": 0.012, "ampRot": 0.4,
         "origin": "50% 100%"},  # Adamo si sveglia: respiro
    15: {"period": 3.0, "ampScale": 0.018,
         "origin": "50% 60%"},   # Adamo dorme: respiro del petto
    16: {"period": 4.2, "ampY": 3, "ampRot": 0.5,
         "origin": "50% 100%"},  # Adamo ed Eva: ondeggio insieme
}


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, check=True, capture_output=True, cwd=cwd)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def make_cutouts() -> dict[int, Path]:
    from rembg import new_session, remove

    session = new_session("u2net")
    cutouts: dict[int, Path] = {}
    for idx in sorted(ANIM):
        src = WORK / f"scene_{idx:02d}.png"
        dst = WORK / f"cutout_{idx:02d}.png"
        cutouts[idx] = dst
        if dst.exists():
            print(f"  cutout {idx:02d} gia' presente, salto", flush=True)
            continue
        print(f"  cutout {idx:02d}...", flush=True)
        dst.write_bytes(remove(src.read_bytes(), session=session))
    return cutouts


def render_scene(idx: int, seconds: float, cutout: Path) -> Path:
    """Renderizza una scena animata via Remotion e la normalizza ai
    parametri di encoding degli altri clip (concat -c copy safe)."""
    PUB.mkdir(parents=True, exist_ok=True)
    bg_pub = PUB / f"scene_{idx:02d}.png"
    fg_pub = PUB / f"cutout_{idx:02d}.png"
    if not bg_pub.exists():
        bg_pub.write_bytes((WORK / f"scene_{idx:02d}.png").read_bytes())
    if not fg_pub.exists():
        fg_pub.write_bytes(cutout.read_bytes())

    props = WORK / f"anim_props_{idx:02d}.json"
    props.write_text(json.dumps({
        "bg": f"scene_{idx:02d}.png",
        "fg": f"cutout_{idx:02d}.png",
        "seconds": round(seconds, 3),
        "zoom": ZOOMS[idx],
        "motion": ANIM[idx],
    }))

    raw = WORK / f"anim_raw_{idx:02d}.mp4"
    run(["npx", "remotion", "render", "CreationScene", str(raw),
         f"--props={props}", "--codec=h264", "--muted",
         "--log=error"], cwd=COMPOSER)

    clip = WORK / f"clip_{idx:02d}.mp4"
    run(["ffmpeg", "-y", "-i", str(raw),
         "-c:v", "libx264", "-preset", "medium", "-crf", "18",
         "-r", str(FPS), "-pix_fmt", "yuv420p", "-an", str(clip)])
    return clip


def main() -> None:
    for idx in ANIM:
        for req in (WORK / f"scene_{idx:02d}.png", WORK / f"voice_{idx:02d}.wav"):
            if not req.exists():
                sys.exit(f"manca {req} — esegui prima build_creation_kids.py")

    print(f"1/4 — ritagli soggetto ({len(ANIM)} scene, rembg u2net)", flush=True)
    cutouts = make_cutouts()

    print("2/4 — render Remotion delle scene animate", flush=True)
    for n, idx in enumerate(sorted(ANIM), 1):
        secs = max(LEAD + duration(WORK / f"voice_{idx:02d}.wav") + GAP, MIN_SCENE)
        render_scene(idx, secs, cutouts[idx])
        print(f"       [{n}/{len(ANIM)}] scena {idx+1} ({secs:.1f}s)", flush=True)

    print("3/4 — riconcat video", flush=True)
    concat_v = WORK / "clips.txt"
    concat_v.write_text(
        "".join(f"file 'clip_{i:02d}.mp4'\n" for i in range(N_SCENES)))
    video_only = WORK / "video_only.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_v),
         "-c", "copy", str(video_only)])

    print("4/4 — remix audio (voce + musica esistenti)", flush=True)
    voice_track = WORK / "voice_track.wav"
    music = WORK / "music.mp3"
    total = duration(video_only)
    fade_out_start = max(total - 4.0, 0)
    run(["ffmpeg", "-y", "-i", str(video_only), "-i", str(voice_track),
         "-stream_loop", "-1", "-i", str(music),
         "-filter_complex",
         f"[2:a]volume={MUSIC_VOLUME},afade=t=in:st=0:d=1.5,"
         f"afade=t=out:st={fade_out_start:.3f}:d=4,aresample=44100[m];"
         f"[1:a]aresample=44100[v];"
         f"[v][m]amix=inputs=2:duration=first:normalize=0[a]",
         "-map", "0:v", "-map", "[a]",
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-t", f"{total:.3f}", str(OUT)])

    print(f"\nfatto: {OUT}", flush=True)
    print(json.dumps({
        "scene_animate": sorted(i + 1 for i in ANIM),
        "durata_s": round(duration(OUT), 1),
        "mb": round(OUT.stat().st_size / 1_048_576, 1),
        "costo_eur": 0,
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
