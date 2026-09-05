#!/usr/bin/env python3
"""Daniele nella fossa dei leoni — modalità FREE, composizione atelier.

Costo: 0 €. Tutto locale: SDXL su MPS per le illustrazioni, Piper per la voce
italiana, ffmpeg per il montaggio.

Differenza dalla v1 (`build_daniele.py`): niente scene-type stock dell'Explainer
(slide con dipinti Wikimedia). Qui le illustrazioni sono generate su misura con
una style bible condivisa, e ogni scena ha movimento Ken Burns.

Sync: la durata di ogni scena È la durata del suo WAV. Le transizioni sono
fade in/out DENTRO la scena, non crossfade tra scene: un crossfade accorcia la
timeline video ma non quella audio, e il disallineamento si accumula.

Uso:
    cd ~/Developer/OpenMontage
    PATH="$PWD/.venv/bin:$PATH" .venv/bin/python build_daniele_atelier.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent
VOICE = ROOT / "assets" / "voices" / "it" / "it_IT-paola-medium.onnx"
WORK = ROOT / "projects" / "demos" / "atelier" / "daniele"
OUT = ROOT / "projects" / "demos" / "renders" / "daniele-atelier.mp4"

W, H, FPS = 1920, 1080, 30
GAP = 0.45          # respiro tra un segmento e l'altro
FADE = 0.4          # fade in/out per scena
SEED_BASE = 7       # stesso seme di base = stessa "mano" del pittore

# La style bible entra IDENTICA in ogni prompt: è ciò che tiene insieme le scene.
STYLE = (
    "painterly biblical storybook illustration, warm torchlight, rich oil texture, "
    "cinematic composition, ancient Babylon, muted earth tones with deep blue accents"
)
# Descrizione del personaggio ripetuta VERBATIM: senza questo Daniele cambia
# faccia a ogni scena e il montaggio sembra fatto da otto illustratori diversi.
DANIEL = "Daniel, a bearded man in a deep blue robe, calm dignified face"
NEGATIVE = "text, watermark, signature, deformed hands, extra limbs, blurry, modern clothing"

SCENES: list[dict[str, object]] = [
    {
        "text": "Daniele era un uomo fedele, consigliere del re Dario, "
                "stimato in tutto il regno di Babilonia.",
        "img": f"{DANIEL} standing in a palace hall of ancient Babylon, "
               f"advisors around him, morning light through tall columns",
        "zoom": "in",
    },
    {
        "text": "Ma altri governatori lo invidiavano. Cercarono un'accusa contro di lui, "
                "e non ne trovarono nessuna.",
        "img": "three envious Babylonian officials whispering in shadow behind a stone pillar, "
               "scheming expressions, torchlight from the side",
        "zoom": "out",
    },
    {
        "text": "Allora convinsero il re a firmare un decreto: per trenta giorni "
                "nessuno poteva pregare alcun dio, se non il re stesso.",
        "img": "King Darius on his throne signing a royal decree on a clay tablet, "
               "officials bowing before him, heavy golden light",
        "zoom": "in",
    },
    {
        "text": "Daniele lo seppe. Salì nella sua stanza, aprì le finestre verso Gerusalemme, "
                "e pregò come faceva ogni giorno.",
        "img": f"{DANIEL} kneeling in prayer by an open window in an upper room, "
               f"distant city at dawn beyond the window, soft light on his face",
        "zoom": "in",
    },
    {
        "text": "I suoi nemici lo videro, e corsero dal re. La legge non poteva essere cambiata.",
        "img": "officials pointing accusingly before a troubled king in a torchlit throne room, "
               "tension, long shadows on stone",
        "zoom": "out",
    },
    {
        "text": "Il re Dario era addolorato, ma dovette ordinare "
                "che Daniele fosse gettato nella fossa dei leoni.",
        "img": "sorrowful King Darius turning away as guards seal a heavy stone over a dark pit, "
               "night, torches, cold blue moonlight against warm fire",
        "zoom": "in",
    },
    {
        "text": "Quella notte il re non riuscì a dormire. All'alba corse alla fossa e gridò: "
                "Daniele, il tuo Dio ha potuto salvarti?",
        "img": "the king running at first light toward a sealed stone pit, "
               "pale dawn sky, robes flowing, desperate hope on his face",
        "zoom": "out",
    },
    {
        "text": "E dal buio rispose la voce di Daniele: Il mio Dio ha mandato il suo angelo, "
                "e ha chiuso la bocca dei leoni.",
        "img": f"{DANIEL} unharmed among calm resting lions in a stone den, "
               f"a shaft of golden light from above, lions peaceful at his feet",
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
            print(f"  [{i+1}/{len(SCENES)}] immagine già presente, salto")
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


def generate_voice() -> list[Path]:
    paths: list[Path] = []
    for i, scene in enumerate(SCENES):
        wav = WORK / f"voice_{i:02d}.wav"
        paths.append(wav)
        if wav.exists():
            continue
        proc = subprocess.run(
            [sys.executable, "-m", "piper", "--model", str(VOICE), "--output_file", str(wav)],
            input=str(scene["text"]), text=True, capture_output=True,
        )
        if proc.returncode != 0 or not wav.exists():
            sys.exit(f"piper fallito sul segmento {i}: {proc.stderr[:400]}")
    return paths


def build_scene_clip(image: Path, seconds: float, zoom: str, out_path: Path) -> None:
    """Ken Burns su una still. La durata è imposta dall'audio, mai il contrario."""
    frames = max(int(round(seconds * FPS)), 2)
    # zoompan lavora sul frame sorgente: si sovracampiona per non vedere i pixel.
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
    if not VOICE.exists():
        sys.exit(f"voce Piper non trovata: {VOICE}")
    WORK.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    print(f"1/5 — illustrazioni ({len(SCENES)} scene, ~45s l'una su M4 Max)")
    images = generate_images()

    print("2/5 — voce italiana (Piper)")
    voices = generate_voice()

    print("3/5 — misuro le durate reali")
    durations = [duration(w) for w in voices]
    scene_secs = [d + GAP for d in durations]
    total = sum(scene_secs)
    print(f"       totale {total:.1f}s su {len(SCENES)} scene")

    print("4/5 — Ken Burns per scena")
    clips: list[Path] = []
    for i, (img, secs) in enumerate(zip(images, scene_secs)):
        clip = WORK / f"clip_{i:02d}.mp4"
        build_scene_clip(img, secs, str(SCENES[i]["zoom"]), clip)
        clips.append(clip)
        print(f"       [{i+1}/{len(clips)}] {secs:.1f}s")

    print("5/5 — montaggio finale")
    # Traccia audio: ogni voce seguita dal suo silenzio, così scena e parlato
    # restano allineati anche se una frase è più lunga del previsto.
    audio_parts: list[Path] = []
    for i, wav in enumerate(voices):
        padded = WORK / f"padded_{i:02d}.wav"
        run(["ffmpeg", "-y", "-i", str(wav),
             "-af", f"apad=pad_dur={GAP},aresample=44100", "-t", f"{scene_secs[i]:.3f}",
             str(padded)])
        audio_parts.append(padded)

    concat_v = WORK / "clips.txt"
    concat_v.write_text("".join(f"file '{c.name}'\n" for c in clips))
    concat_a = WORK / "audio.txt"
    concat_a.write_text("".join(f"file '{a.name}'\n" for a in audio_parts))

    video_only = WORK / "video_only.mp4"
    audio_only = WORK / "audio_only.wav"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_v),
         "-c", "copy", str(video_only)])
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_a),
         "-c", "copy", str(audio_only)])
    run(["ffmpeg", "-y", "-i", str(video_only), "-i", str(audio_only),
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(OUT)])

    print(f"\nfatto: {OUT}")
    print(json.dumps({
        "scene": len(SCENES),
        "durata_s": round(duration(OUT), 1),
        "mb": round(OUT.stat().st_size / 1_048_576, 1),
        "costo_eur": 0,
    }, indent=2))


if __name__ == "__main__":
    main()
