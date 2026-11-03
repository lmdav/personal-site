"""Generates narration audio with Kokoro, a free voice model that runs locally.

Usage:
  .venv/bin/python narrate.py samples                 # voice samples into out/voice-samples/
  .venv/bin/python narrate.py <slug> [voice]           # one WAV per scene into public/<slug>/narration/

Scene lines come from src/recipes/<slug>.narration.json. Durations are written to
src/data/<slug>.narration.json so the video can time each scene to its audio.
"""
import json
import sys
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
MODEL = HERE / "models" / "kokoro-v1.0.int8.onnx"
VOICES = HERE / "models" / "voices-v1.0.bin"
DEFAULT_VOICE = "af_heart"

SAMPLE_LINE = (
    "Get the pan smoking hot. Lay a square of parchment on top, press the beef "
    "as flat as you can, and then leave it alone for two minutes while the crust forms."
)


def speak(kokoro, text, voice, out):
    samples, rate = kokoro.create(text, voice=voice, speed=1.0, lang="en-us")
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, samples, rate)
    return len(samples) / rate


def main():
    kokoro = Kokoro(str(MODEL), str(VOICES))
    target = sys.argv[1] if len(sys.argv) > 1 else "samples"
    if target == "samples":
        for voice in ("af_heart", "am_michael", "bf_emma"):
            seconds = speak(kokoro, SAMPLE_LINE, voice, HERE / "out" / "voice-samples" / f"{voice}.wav")
            print(f"{voice}: {seconds:.1f} s")
        return

    voice = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_VOICE
    lines = json.loads((HERE / "src" / "recipes" / f"{target}.narration.json").read_text())
    durations = {}
    for scene, text in lines.items():
        durations[scene] = round(speak(kokoro, text, voice, HERE / "public" / target / "narration" / f"{scene}.wav"), 3)
        print(f"{scene}: {durations[scene]:.1f} s")
    out = HERE / "src" / "data" / f"{target}.narration.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"voice": voice, "durations": durations}, indent=2))


if __name__ == "__main__":
    main()
