#!/usr/bin/env python3
"""When God Made Everything — kids animation, FREE mode, atelier composition.

Costo: 0 EUR. Tutto locale: SDXL su MPS per le illustrazioni, ffmpeg per il
montaggio. Niente testo a schermo, niente narrazione: solo animazioni (Ken
Burns) + musica royalty-free (Pixabay).

Fonte narrativa: libro illustrato "When God Made Everything" (Genesi 1-2),
20 pagine in ~/Desktop/Creatia — usate SOLO come ispirazione narrativa.
L'estetica è reinventata: storybook caldo, NON clipart.

Sync: senza voce la durata di ogni scena è fissa (SCENE_SECONDS). Fade
in/out DENTRO la scena, mai crossfade tra scene.

Uso:
    cd ~/Developer/OpenMontage
    PATH="$PWD/.venv/bin:$PATH" .venv/bin/python build_creation_kids.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
WORK = ROOT / "projects" / "creation-kids" / "assets"
OUT = ROOT / "projects" / "creation-kids" / "renders" / "creation-kids.mp4"

W, H, FPS = 1920, 1080, 30
SCENE_SECONDS = 6.7      # 18 scene x 6.7s = 120.6s
FADE = 0.5               # fade in/out per scena
SEED_BASE = 21           # stessa "mano" del pittore su tutte le scene
MUSIC_QUERY = "gentle whimsical children storybook orchestral"

# Style bible IDENTICA in ogni prompt: tiene insieme le 18 scene.
STYLE = (
    "warm children's picture-book illustration, soft gouache and watercolor "
    "texture, rounded friendly shapes, gentle golden light, rich cozy colors, "
    "whimsical sense of wonder, storybook art for young children"
)
# Personaggi ripetuti VERBATIM dove appaiono (stile coerente; il volto in
# FREE puo' variare leggermente tra scene — limite noto e accettato).
ADAM = "a kind young man with curly brown hair and a short brown beard, tan skin"
EVE = "a kind young woman with long wavy brown hair, tan skin"
NEGATIVE = (
    "text, letters, words, watermark, signature, deformed hands, extra limbs, "
    "blurry, scary, horror, photorealistic, photo, "
    "house, building, cottage, hut, village"
)

SCENES: list[dict[str, str]] = [
    {  # 1 — prima di tutto: solo Dio (colomba di luce nel nulla)
        "img": "endless deep indigo darkness with a single small glowing white "
               "dove of soft light floating gently in the center, warm golden "
               "halo, peaceful mystery",
        "zoom": "in",
    },
    {  # 2 — "sia la luce"
        "img": "a brilliant burst of warm golden light breaking through deep "
               "blue darkness, soft rays spreading everywhere, tiny sparkles, "
               "the dawn of creation",
        "zoom": "out",
    },
    {  # 3 — giorno e notte (primo giorno): la prima alba
        "img": "the very first sunrise, a big warm golden sun rising over a "
               "brand new world of green hills, deep blue night sky with "
               "fading stars on one side, bright warm morning light on the "
               "other, soft mist in the valleys",
        "zoom": "in",
    },
    {  # 4 — le acque ordinate (secondo giorno)
        "img": "a vast rolling ocean with playful turquoise waves under a "
               "bright blue sky, white sea foam, sunlight sparkling on the "
               "water, small white clouds",
        "zoom": "out",
    },
    {  # 5 — la terra asciutta (terzo giorno)
        "img": "green rolling hills and gentle brown mountains rising beside a "
               "deep blue sea, fresh new land in soft morning light",
        "zoom": "in",
    },
    {  # 6 — erba, fiori, alberi (terzo giorno)
        "img": "a lush meadow full of colorful flowers, red tulips and white "
               "daisies, palm trees and fruit trees, a gentle stream winding "
               "through, butterflies",
        "zoom": "out",
    },
    {  # 7 — sole, luna, stelle (quarto giorno)
        "img": "a deep blue night sky full of countless twinkling stars, a "
               "friendly crescent moon, and a warm glowing sun rising far away "
               "on the horizon",
        "zoom": "in",
    },
    {  # 8 — creature del mare (quinto giorno)
        "img": "an underwater scene with a big friendly whale, a silver "
               "swordfish and a school of tiny sardines swimming among "
               "colorful coral, sunbeams shining through turquoise water",
        "zoom": "out",
    },
    {  # 9 — uccelli (quinto giorno)
        "img": "colorful birds in a blooming garden, a toucan perched on a "
               "branch, a little red hummingbird sipping from white flowers, "
               "a tall ostrich standing proudly, bright blue sky",
        "zoom": "in",
    },
    {  # 10 — animali grandi (sesto giorno)
        "img": "a friendly gray elephant, a smiling brown hippo and a playful "
               "monkey together on a green savanna with acacia trees, warm "
               "afternoon light",
        "zoom": "out",
    },
    {  # 11 — animali piccoli (sesto giorno)
        "img": "cute red squirrels, a busy beaver carrying a branch, a purring "
               "cat and a gentle tall giraffe in a sunny green forest "
               "clearing, flowers in the grass",
        "zoom": "in",
    },
    {  # 12 — Adamo prende vita
        "img": f"{ADAM}, lying on soft grass slowly waking up in a beautiful "
               f"garden, stretching one arm toward the warm golden morning "
               f"light, flowers all around",
        "zoom": "in",
    },
    {  # 13 — il giardino dell'Eden
        "img": "a breathtaking garden paradise with a winding bright blue "
               "river, a small waterfall, lush green trees, flowers "
               "everywhere, warm golden light, distant hills",
        "zoom": "out",
    },
    {  # 14 — l'albero della conoscenza
        "img": "a magnificent lone tree with glowing golden-red fruits in the "
               "middle of a lush green garden, a soft yellow halo of light "
               "around its crown",
        "zoom": "in",
    },
    {  # 15 — Adamo dà il nome agli animali
        "img": f"a tall grown adult man, {ADAM}, full beard, standing happily "
               f"among friendly animals, an elephant, a giraffe, squirrels and "
               f"colorful birds gathered around him in the garden",
        "zoom": "out",
    },
    {  # 16 — il sonno profondo
        "img": f"{ADAM}, sleeping peacefully on a bed of soft moss under a "
               f"big tree, tiny sparkles of gentle light floating above him, "
               f"soft purple dusk light",
        "zoom": "in",
    },
    {  # 17 — Adamo ed Eva insieme
        "img": f"{ADAM} and {EVE}, standing together smiling in the garden of "
               f"Eden, surrounded by flowers and friendly animals, warm "
               f"golden light",
        "zoom": "out",
    },
    {  # 18 — il riposo: pace sul creato
        "img": "a peaceful sunset over a garden paradise, a river reflecting "
               "orange and pink sky, silhouettes of trees, two white doves "
               "flying, deep sense of calm and love",
        "zoom": "in",
    },
]


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        check=True, capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def generate_images() -> list[Path]:
    from tools.graphics.local_diffusion import LocalDiffusion

    tool = LocalDiffusion()
    paths: list[Path] = []
    for i, scene in enumerate(SCENES):
        target = WORK / f"scene_{i:02d}.png"
        paths.append(target)
        if target.exists():
            print(f"  [{i+1}/{len(SCENES)}] immagine gia' presente, salto", flush=True)
            continue
        print(f"  [{i+1}/{len(SCENES)}] genero...", flush=True)
        result = tool.execute({
            "prompt": f"{scene['img']}, {STYLE}",
            "negative_prompt": NEGATIVE,
            "width": 1024, "height": 1024,
            "num_inference_steps": 30,
            "seed": SEED_BASE + i,
            "output_path": str(target),
        })
        if not result.success:
            sys.exit(f"generazione immagine {i} fallita: {result.error}")
    return paths


def fetch_music() -> Path | None:
    """Musica royalty-free da Pixabay. Tool EXPERIMENTAL: se fallisce,
    si consegna senza musica e lo si dice — mai bloccare la pipeline."""
    target = WORK / "music.mp3"
    if target.exists():
        return target
    try:
        from tools.audio.pixabay_music import PixabayMusic
        result = PixabayMusic().execute({
            "query": MUSIC_QUERY,
            "min_duration": 100,
            "max_duration": 360,
            "output_path": str(target),
        })
        if result.success and target.exists():
            return target
        print(f"  pixabay_music fallito: {result.error}", flush=True)
    except Exception as exc:  # scraper experimental: qualunque rottura è non-fatale
        print(f"  pixabay_music exception: {exc}", flush=True)
    return None


def build_scene_clip(image: Path, seconds: float, zoom: str, out_path: Path) -> None:
    """Ken Burns su una still, sovracampionata 2x per non vedere i pixel."""
    frames = max(int(round(seconds * FPS)), 2)
    if zoom == "in":
        z = "min(zoom+0.0009,1.35)"
    else:
        z = "if(lte(zoom,1.0),1.35,max(zoom-0.0009,1.0))"
    fade_out_start = max(seconds - FADE, 0)
    vf = (
        f"scale={W*2}:{H*2}:force_original_aspect_ratio=increase,"
        f"crop={W*2}:{H*2},"
        f"zoompan=z='{z}':d={frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        f"s={W}x{H}:fps={FPS},"
        f"fade=t=in:st=0:d={FADE},fade=t=out:st={fade_out_start:.3f}:d={FADE},"
        f"format=yuv420p"
    )
    run([
        "ffmpeg", "-y", "-loop", "1", "-i", str(image),
        "-vf", vf, "-t", f"{seconds:.3f}", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "medium", "-crf", "18",
        str(out_path),
    ])


def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    print(f"1/4 — illustrazioni ({len(SCENES)} scene, ~45s l'una su M4 Max)", flush=True)
    images = generate_images()

    print("2/4 — musica (Pixabay, royalty-free)", flush=True)
    music = fetch_music()
    print(f"       musica: {'ok' if music else 'NON disponibile — consegno senza'}", flush=True)

    print("3/4 — Ken Burns per scena", flush=True)
    clips: list[Path] = []
    for i, img in enumerate(images):
        clip = WORK / f"clip_{i:02d}.mp4"
        if not clip.exists():
            build_scene_clip(img, SCENE_SECONDS, SCENES[i]["zoom"], clip)
        clips.append(clip)
        print(f"       [{i+1}/{len(SCENES)}]", flush=True)

    print("4/4 — montaggio finale", flush=True)
    concat_v = WORK / "clips.txt"
    concat_v.write_text("".join(f"file '{c.name}'\n" for c in clips))
    video_only = WORK / "video_only.mp4"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_v),
         "-c", "copy", str(video_only)])

    total = duration(video_only)
    if music:
        # Musica loopata alla durata video, fade in 1.5s e fade out 4s.
        fade_out_start = max(total - 4.0, 0)
        run(["ffmpeg", "-y", "-i", str(video_only),
             "-stream_loop", "-1", "-i", str(music),
             "-af", f"afade=t=in:st=0:d=1.5,afade=t=out:st={fade_out_start:.3f}:d=4,"
                    f"aresample=44100",
             "-map", "0:v", "-map", "1:a",
             "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
             "-t", f"{total:.3f}", str(OUT)])
    else:
        run(["ffmpeg", "-y", "-i", str(video_only), "-c", "copy", str(OUT)])

    print(f"\nfatto: {OUT}", flush=True)
    print(json.dumps({
        "scene": len(SCENES),
        "durata_s": round(duration(OUT), 1),
        "mb": round(OUT.stat().st_size / 1_048_576, 1),
        "musica": bool(music),
        "costo_eur": 0,
    }, indent=2), flush=True)


if __name__ == "__main__":
    main()
