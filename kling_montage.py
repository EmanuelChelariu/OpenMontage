#!/usr/bin/env python3
"""Montaggio finale con i clip Kling — creation-kids.

Le 12 scene generative (kling_clip_XX.mp4, gia' scaricate) vengono
tagliate alla durata esatta della scena (dalla voce), con fade in/out
identici alle scene ffmpeg/Remotion, e sostituiscono i clip_XX.
Le 6 scene restanti (idx 2,4,5,12,13,14) restano come sono.

Uso:
    cd ~/Developer/OpenMontage
    PATH="$PWD/.venv/bin:$PATH" PYTHONPATH="$PWD" \
      .venv/bin/python kling_montage.py
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
WORK = ROOT / "projects" / "creation-kids" / "assets"
OUT = ROOT / "projects" / "creation-kids" / "renders" / "creation-kids.mp4"

FPS = 30
MIN_SCENE = 5.5
LEAD = 0.35
GAP = 0.6
FADE = 0.5
MUSIC_VOLUME = 0.18
N_SCENES = 18
KLING = [0, 1, 3, 6, 7, 8, 9, 10, 11, 15, 16, 17]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def trim_with_fades(src: Path, secs: float, dst: Path) -> None:
    """Taglia (o estende congelando l'ultimo frame) alla durata ESATTA della
    scena: la timeline audio e' gia' fissata, la scena non puo' cambiare."""
    fade_out_start = max(secs - FADE, 0)
    vf = (f"fps={FPS},scale=1920:1080,"
          f"tpad=stop_mode=clone:stop_duration={secs:.3f},"
          f"fade=t=in:st=0:d={FADE},fade=t=out:st={fade_out_start:.3f}:d={FADE},"
          f"format=yuv420p")
    run(["ffmpeg", "-y", "-i", str(src), "-vf", vf,
         "-t", f"{secs:.3f}", "-r", str(FPS), "-an",
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", str(dst)])


def main() -> None:
    print("1/3 — taglio clip Kling alla durata scena", flush=True)
    for idx in KLING:
        src = WORK / f"kling_clip_{idx:02d}.mp4"
        if not src.exists():
            raise SystemExit(f"manca {src} — batch incompleto")
        secs = max(LEAD + duration(WORK / f"voice_{idx:02d}.wav") + GAP, MIN_SCENE)
        avail = duration(src)
        if avail < secs:
            print(f"       scena {idx+1}: clip {avail:.2f}s < scena {secs:.2f}s"
                  f" — estendo congelando l'ultimo frame", flush=True)
        trim_with_fades(src, secs, WORK / f"clip_{idx:02d}.mp4")
        print(f"       [{idx+1:02d}] {secs:.1f}s", flush=True)

    print("2/3 — riconcat video", flush=True)
    concat_v = WORK / "clips.txt"
    concat_v.write_text(
        "".join(f"file 'clip_{i:02d}.mp4'\n" for i in range(N_SCENES)))
    video_only = WORK / "video_only.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_v),
         "-c", "copy", str(video_only)])

    print("3/3 — remix audio", flush=True)
    total = duration(video_only)
    fade_out_start = max(total - 4.0, 0)
    run(["ffmpeg", "-y", "-i", str(video_only),
         "-i", str(WORK / "voice_track.wav"),
         "-stream_loop", "-1", "-i", str(WORK / "music.mp3"),
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
        "scene_kling": [i + 1 for i in KLING],
        "durata_s": round(duration(OUT), 1),
        "mb": round(OUT.stat().st_size / 1_048_576, 1),
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
