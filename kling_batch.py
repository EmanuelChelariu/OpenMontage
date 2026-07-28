#!/usr/bin/env python3
"""Lotto Kling 3.0 Pro — 11 scene image-to-video per creation-kids.

Piano approvato: 12 scene generative (8 eroe + 4 atmosfera); la balena
(idx 7) e' gia' generata dal campione. Budget: ~60 unita' su 95,2 residue.

Resume-safe: un clip gia' presente su disco viene saltato. 3 generazioni
in parallelo (il trial ne consente 5). sound="off" (stringa!), niente
resolution sul percorso classic (la qualita' la decide mode="pro").

Uso:
    cd ~/Developer/OpenMontage && set -a && source .env && set +a
    PATH="$PWD/.venv/bin:$PATH" PYTHONPATH="$PWD" \
      .venv/bin/python kling_batch.py
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).parent
WORK = ROOT / "projects" / "creation-kids" / "assets"

STYLE_SUFFIX = (" Calm dreamlike motion, soft and slow. Camera almost static "
                "with a very slow push-in. Keep the exact watercolor "
                "picture-book style of the input image.")
NEGATIVE = ("text, watermark, style change, photorealistic, distortion, "
            "morphing, extra creatures, extra people, changing faces, "
            "changing eyes, new animals appearing, new markings, "
            "exaggerated expressions, deformed birds, white blobs")

# idx -> (durata scena in s, objectPosition Y del crop, prompt di movimento)
SCENES: dict[int, tuple[float, float, str]] = {
    0:  (6.0, 0.50, "The glowing white dove gently flaps its wings and floats "
                    "in the deep blue darkness, its golden halo shimmering, "
                    "tiny sparkles drifting around."),
    1:  (5.5, 0.50, "Warm golden light rays slowly expand and swirl through "
                    "deep blue darkness, sparkles floating upward, the dawn "
                    "of creation unfolding."),
    3:  (5.5, 0.50, "Turquoise ocean waves roll gently, white sea foam moves, "
                    "sunlight sparkles on the water, small clouds drift "
                    "slowly across the sky."),
    6:  (6.6, 0.50, "Stars twinkle softly in the deep blue sky, the friendly "
                    "crescent moon glows, the distant sun slowly rises on "
                    "the horizon, gentle shimmer everywhere."),
    8:  (6.3, 0.13, "The toucan stays calmly perched, only tilting its head "
                    "very slightly; its eye and beak keep exactly the same "
                    "shape, colors and pattern as the input image. The "
                    "flowers sway softly in the breeze. Tiny subtle motion."),
    9:  (6.1, 0.50, "The mother elephant slowly waves her trunk, the baby "
                    "elephant flaps its big ears, the little monkey tilts "
                    "its head curiously, warm afternoon light."),
    10: (7.5, 0.50, "The squirrels' fluffy tails sway gently and the "
                    "flowers move in the breeze; every animal keeps exactly "
                    "the same face, species, colors and markings as the "
                    "input image. Only tiny, subtle movements."),
    11: (7.5, 0.50, "The young man slowly wakes up and stretches his arm "
                    "toward the warm morning light, flowers sway around him. "
                    "His face stays exactly the same as the input image."),
    15: (5.5, 0.50, "The sleeping man breathes slowly and peacefully, tiny "
                    "sparkles of gentle light float above him, the leaves "
                    "of the big tree sway softly in the dusk."),
    16: (7.0, 0.50, "The man and the woman stand together holding hands, "
                    "hair and clothes moving very gently in the breeze, "
                    "flowers swaying around them. Their faces and "
                    "expressions remain exactly as in the input image, "
                    "unchanged. Only tiny, subtle movements."),
    17: (6.4, 0.50, "The sunset sky glows warmly, clouds drift slowly, the "
                    "river shimmers with orange and pink reflections, tree "
                    "leaves sway gently. The white doves stay exactly as "
                    "they are in the input image, unchanged."),
}


def prep_input(idx: int, pos_y: float) -> Path:
    """Ritaglia l'illustrazione 1024^2 nello stesso quadro 16:9 del montaggio."""
    out = WORK / f"kling_in_{idx:02d}.png"
    if out.exists():
        return out
    y = int(round(pos_y * (1920 - 1080)))
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(WORK / f"scene_{idx:02d}.png"),
         "-vf", f"scale=1920:1920:flags=lanczos,crop=1920:1080:0:{y}",
         str(out)],
        check=True, capture_output=True)
    return out


def generate(idx: int) -> dict[str, object]:
    from tools.video.kling_official_video import KlingOfficialVideo

    secs, pos_y, motion = SCENES[idx]
    out = WORK / f"kling_clip_{idx:02d}.mp4"
    if out.exists():
        return {"idx": idx, "status": "skip (esiste)"}
    src = prep_input(idx, pos_y)
    duration = str(min(math.ceil(secs), 15))
    result = KlingOfficialVideo().execute({
        "operation": "image_to_video",
        "api_family": "classic",
        "model_name": "kling-v3",
        "mode": "pro",
        "duration": duration,
        "sound": "off",
        "prompt": motion + STYLE_SUFFIX,
        "negative_prompt": NEGATIVE,
        "reference_image_path": str(src.relative_to(ROOT)),
        "output_path": str(out.relative_to(ROOT)),
        "timeout_seconds": 1200,
    })
    if not result.success:
        return {"idx": idx, "status": f"FALLITO: {str(result.error)[:200]}"}
    return {"idx": idx, "status": f"ok {duration}s",
            "task_id": result.data.get("task_id")}


def main() -> None:
    todo = [i for i in sorted(SCENES) if not (WORK / f"kling_clip_{i:02d}.mp4").exists()]
    print(f"da generare: {[i+1 for i in todo]} ({len(todo)} clip)", flush=True)
    failures = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(generate, i): i for i in todo}
        for fut in as_completed(futures):
            r = fut.result()
            print(f"  scena {r['idx']+1}: {r['status']}", flush=True)
            if "FALLITO" in str(r["status"]):
                failures += 1
    print(json.dumps({"generati": len(todo) - failures, "falliti": failures}),
          flush=True)
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
