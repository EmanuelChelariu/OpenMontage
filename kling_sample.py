#!/usr/bin/env python3
"""Campione Kling 3.0 Pro — balena (scena 8), image-to-video dal frame 16:9.

Fix vs primo tentativo: sound="off" (stringa, non booleano); resolution
rimosso (il percorso classic la ignora, la qualita' la decide mode="pro").

Uso:
    cd ~/Developer/OpenMontage
    PATH="$PWD/.venv/bin:$PATH" .venv/bin/python kling_sample.py
"""
import json

from tools.tool_registry import registry

registry.discover()
result = registry._tools["kling_official_video"].execute({
    "operation": "image_to_video",
    "api_family": "classic",
    "model_name": "kling-v3",
    "mode": "pro",
    "duration": "6",
    "sound": "off",
    "prompt": ("Gentle storybook animation: the friendly blue watercolor whale "
               "glides slowly forward through turquoise water, tail moving softly "
               "up and down, small orange fish swim past, rays of sunlight shimmer, "
               "tiny bubbles drift upward. Calm dreamlike motion, soft and slow. "
               "Camera almost static with a very slow push-in. Keep the exact "
               "watercolor picture-book style of the input image."),
    "negative_prompt": ("text, watermark, style change, photorealistic, "
                        "distortion, morphing, extra creatures"),
    "reference_image_path": "projects/creation-kids/assets/kling_in_07.png",
    "output_path": "projects/creation-kids/assets/kling_clip_07.mp4",
    "timeout_seconds": 900,
})
print("success:", result.success)
if result.success:
    d = result.data
    print(json.dumps({k: d.get(k) for k in
                      ("output_path", "cost_usd", "task_id", "model_name",
                       "duration")}, indent=2, default=str))
else:
    print("ERROR:", str(result.error)[:500])
