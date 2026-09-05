"""Zero-key build: narrazione Piper IT + timing + props JSON per 'Daniele nella fossa dei leoni'.

Genera un WAV per segmento, misura la durata reale con ffprobe, concatena (con piccole
pause) in una narration.wav e scrive un props Remotion con le scene sincronizzate.
"""
from __future__ import annotations
import json, subprocess, os, shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parent
COMPOSER = ROOT / "remotion-composer"
PUB = COMPOSER / "public" / "daniele"
VOICE = ROOT / "assets/voices/it/it_IT-paola-medium.onnx"
GAP = 0.45            # pausa tra segmenti (s)
TAIL = 1.2           # coda dopo l'ultima parola (s)
SR = 22050

# (id, testo narrato, spec scena)
# spec: {"kind": "image"|"callout"|"hero", ...}
SCENES = [
    ("s01", "Daniele nella fossa dei leoni.",
     {"kind": "hero", "img": "engraving.jpg", "title": "Daniele", "subtitle": "nella fossa dei leoni", "overlay": 0.5}),
    ("s02", "Daniele era un ebreo di Gerusalemme, deportato a Babilonia da giovane. Lontano dalla sua terra, era rimasto un uomo integro: saggio, e fedele al suo Dio. Il re Dario lo stimava a tal punto da volerlo mettere a capo di tutto il regno.",
     {"kind": "image", "img": "rubens2.jpg", "anim": "ken-burns", "section": "Il personaggio"}),
    ("s03", "Ma gli altri funzionari, rosi dall'invidia, cercavano un pretesto per accusarlo. Non trovarono nulla: Daniele era irreprensibile.",
     {"kind": "image", "img": "lacma-den.jpg", "anim": "pan-right", "section": "L'invidia"}),
    ("s04", "Allora architettarono un inganno. Convinsero il re a firmare un decreto: per trenta giorni nessuno poteva pregare alcun dio o uomo, se non il re. E per la legge dei Medi e dei Persiani, un decreto firmato era irrevocabile.",
     {"kind": "callout", "img": "lacma-den.jpg", "ctype": "warning", "title": "Il decreto irrevocabile",
      "text": "Per trenta giorni, nessuna preghiera se non al re Dario.", "overlay": 0.62}),
    ("s05", "Daniele lo sapeva. Eppure, tornato a casa, salì nella sua stanza, aprì le finestre verso Gerusalemme e, come ogni giorno, si inginocchiò a pregare il suo Dio. Senza nascondersi.",
     {"kind": "image", "img": "engraving.jpg", "anim": "ken-burns", "section": "La preghiera"}),
    ("s06", "I nemici lo sorpresero e corsero dal re. Dario, capita la trappola, si addolorò, e cercò fino al tramonto un modo per salvarlo. Ma la legge non poteva essere cambiata. Daniele fu gettato nella fossa, e una pietra ne sigillò l'apertura.",
     {"kind": "image", "img": "rubens-den.jpg", "anim": "zoom-in", "section": "La condanna"}),
    ("s07", "Quella notte il re non mangiò e non dormì. All'alba corse alla fossa e gridò: Daniele, il tuo Dio ti ha potuto salvare?",
     {"kind": "callout", "img": "riviere-den.jpg", "ctype": "quote", "title": "Il re Dario, all'alba",
      "text": "«Daniele, il tuo Dio ti ha potuto salvare?»", "overlay": 0.55}),
    ("s08", "E dal buio rispose la voce viva di Daniele: Il mio Dio ha mandato il suo angelo e ha chiuso le fauci dei leoni, perche sono stato trovato innocente davanti a lui.",
     {"kind": "callout", "img": "answer-king.jpg", "ctype": "quote", "title": "Daniele",
      "text": "«Il mio Dio ha mandato il suo angelo e ha chiuso le fauci dei leoni.»", "overlay": 0.5}),
    ("s09", "Daniele fu tirato fuori senza una sola ferita, perche aveva confidato nel suo Dio. E il re proclamo in tutto il regno che il Dio di Daniele e il Dio vivente.",
     {"kind": "hero", "img": "riviere-den.jpg", "title": "Il Dio vivente", "subtitle": "Daniele 6", "overlay": 0.55}),
]

THEME = {
    "primaryColor": "#C9A24B",
    "accentColor": "#E0B95C",
    "backgroundColor": "#0B0A0F",
    "surfaceColor": "#161219",
    "textColor": "#F4ECDD",
    "headingFont": "Space Grotesk",
    "chartColors": ["#E0B95C", "#C9A24B", "#B5532F", "#7A5C9E", "#8A6D3B"],
    "captionHighlightColor": "#E0B95C",
}


def run(cmd, **kw):
    return subprocess.run(cmd, check=True, **kw)


def dur(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def main():
    PUB.mkdir(parents=True, exist_ok=True)
    seg_dir = PUB / "seg"
    seg_dir.mkdir(exist_ok=True)

    # 1) TTS per segmento
    wavs, durs = [], []
    for sid, text, _ in SCENES:
        wav = seg_dir / f"{sid}.wav"
        subprocess.run(
            ["python", "-m", "piper", "--model", str(VOICE), "--output_file", str(wav)],
            input=text, text=True, check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        d = dur(wav)
        wavs.append(wav); durs.append(d)
        print(f"  {sid}: {d:5.2f}s  {text[:50]}...")

    # 2) silenzio di raccordo
    sil = seg_dir / "sil.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", f"anullsrc=r={SR}:cl=mono", "-t", str(GAP),
         "-c:a", "pcm_s16le", str(sil)])

    # 3) concat narration.wav (re-encode uniforme)
    inputs, labels = [], []
    idx = 0
    for i, w in enumerate(wavs):
        inputs += ["-i", str(w)]; labels.append(f"[{idx}:a]"); idx += 1
        if i < len(wavs) - 1:
            inputs += ["-i", str(sil)]; labels.append(f"[{idx}:a]"); idx += 1
    filt = "".join(labels) + f"concat=n={len(labels)}:v=0:a=1[a]"
    narr = PUB / "narration.wav"
    run(["ffmpeg", "-y", "-loglevel", "error", *inputs,
         "-filter_complex", filt, "-map", "[a]", str(narr)])
    total = dur(narr)
    print(f"narration.wav = {total:.2f}s")

    # 4) timing cumulativo + cuts/overlays
    cuts, overlays = [], []
    t = 0.0
    for i, (sid, _text, spec) in enumerate(SCENES):
        start = t
        end = start + durs[i] + (GAP if i < len(SCENES) - 1 else TAIL)
        t = end
        img = f"daniele/{spec['img']}"
        kind = spec["kind"]
        if kind == "image":
            cuts.append({"id": sid, "source": img, "in_seconds": round(start, 2),
                         "out_seconds": round(end, 2), "animation": spec.get("anim", "ken-burns")})
            if spec.get("section"):
                overlays.append({"type": "section_title", "in_seconds": round(start + 0.3, 2),
                                 "out_seconds": round(end, 2), "text": spec["section"],
                                 "accentColor": THEME["accentColor"], "position": "top-left"})
        elif kind == "callout":
            cuts.append({"id": sid, "source": "", "type": "callout",
                         "callout_type": spec["ctype"], "title": spec.get("title"),
                         "text": spec["text"], "backgroundImage": img,
                         "backgroundOverlay": spec.get("overlay", 0.55),
                         "in_seconds": round(start, 2), "out_seconds": round(end, 2)})
        elif kind == "hero":
            cuts.append({"id": sid, "source": "", "type": "hero_title",
                         "text": spec["title"], "heroSubtitle": spec.get("subtitle"),
                         "backgroundImage": img, "backgroundOverlay": spec.get("overlay", 0.5),
                         "in_seconds": round(start, 2), "out_seconds": round(end, 2)})

    props = {"themeConfig": THEME, "cuts": cuts, "overlays": overlays,
             "audio": {"narration": {"src": "daniele/narration.wav", "volume": 1.0}}}
    out = COMPOSER / "public" / "demo-props" / "daniele-fossa-leoni.json"
    out.write_text(json.dumps(props, ensure_ascii=False, indent=2))
    print("props ->", out)
    print(f"durata video ~ {t:.1f}s")


if __name__ == "__main__":
    main()
