"""Generates narration audio with Kokoro, a free voice model that runs locally.

Usage:
  .venv/bin/python narrate.py samples                 # voice samples into out/voice-samples/
  .venv/bin/python narrate.py say "some text"         # one line into out/voice-samples/say.wav
  .venv/bin/python narrate.py <slug> [voice]           # one WAV per scene into public/<slug>/narration/

Scene lines come from src/recipes/<slug>.narration.json. A scene is a list of beats, each
{"speak", "caption"}; the beats are spoken one after another into the scene's WAV. Durations
and the times each beat starts and ends are written to src/data/<slug>.narration.json, so
the video can time each scene, caption, and action to its audio, and
tools/check-narration.mjs can check each spoken line against the script.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

HERE = Path(__file__).parent
MODEL = HERE / "models" / "kokoro-v1.0.int8.onnx"
VOICES = HERE / "models" / "voices-v1.0.bin"
DEFAULT_VOICE = "af_heart"
LANG = "en-us"
SPEED = 0.9  # a little slower than normal, easier to follow
GAP = 0.45  # seconds of quiet between beats

# Words the voice gets wrong, with the phonemes to say instead. Without these, "romaine"
# comes out as RAH-mayn (like "ramen"), "patties" as PAT-iz, and "paprika" as PAP-rih-kuh.
PRONOUNCE = {
    "romaine": "ɹoʊmˈeɪn",  # roh-MAYN
    "patties": "pˈæɾiz",  # PAT-eez
    "paprika": "pəpɹˈiːkə",  # puh-PREE-kuh
}

SAMPLE_LINE = (
    "Get the pan smoking hot. Lay a square of parchment on top, press the beef "
    "as flat as you can, and then leave it alone for two minutes while the crust forms."
)


def phonemes(kokoro, text):
    """The text as phonemes, with the dictionary's words swapped in. Fails loudly if a
    dictionary word is in the text but its usual phonemes are not where we expect."""
    out = kokoro.tokenizer.phonemize(text, LANG)
    for word, fixed in PRONOUNCE.items():
        if not re.search(rf"\b{word}\b", text, re.IGNORECASE):
            continue
        usual = kokoro.tokenizer.phonemize(word, LANG).strip()
        if usual not in out:
            raise ValueError(f"Could not find {word!r} ({usual}) in the phonemes of {text!r}: {out}")
        out = out.replace(usual, fixed)
    return out


def synth(kokoro, text, voice):
    samples, rate = kokoro.create(phonemes(kokoro, text), voice=voice, speed=SPEED, lang=LANG, is_phonemes=True)
    return samples, rate


def write(out, samples, rate):
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, samples, rate)
    return len(samples) / rate


def beats_of(line):
    """A scene's beats: a list of {"speak", "caption"}, or one line as a string or dict."""
    if isinstance(line, str):
        return [{"speak": line}]
    if isinstance(line, dict):
        return [line]
    return line


def main():
    kokoro = Kokoro(str(MODEL), str(VOICES))
    target = sys.argv[1] if len(sys.argv) > 1 else "samples"
    samples_dir = HERE / "out" / "voice-samples"
    if target == "samples":
        for voice in ("af_heart", "am_michael", "bf_emma"):
            seconds = write(samples_dir / f"{voice}.wav", *synth(kokoro, SAMPLE_LINE, voice))
            print(f"{voice}: {seconds:.1f} s")
        return
    if target == "say":
        text = " ".join(sys.argv[2:])
        print(phonemes(kokoro, text))
        print(f"{write(samples_dir / 'say.wav', *synth(kokoro, text, DEFAULT_VOICE)):.1f} s")
        return

    voice = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_VOICE
    lines = json.loads((HERE / "src" / "recipes" / f"{target}.narration.json").read_text())
    durations = {}
    starts = {}
    ends = {}
    clips = {}  # written only once every scene has been spoken, so a failure part way
    # through never leaves new audio next to old timings
    for scene, line in lines.items():
        parts = []
        starts[scene] = []
        ends[scene] = []
        at = 0.0
        rate = 24000
        for i, beat in enumerate(beats_of(line)):
            audio, rate = synth(kokoro, beat["speak"], voice)
            if i:
                parts.append(np.zeros(int(GAP * rate), dtype=audio.dtype))
                at += GAP
            starts[scene].append(round(at, 3))
            parts.append(audio)
            at += len(audio) / rate
            ends[scene].append(round(at, 3))
        clips[scene] = (np.concatenate(parts), rate)
        durations[scene] = round(len(clips[scene][0]) / rate, 3)
        print(f"{scene}: {durations[scene]:.1f} s, beats at {starts[scene]}")
    for scene, (audio, rate) in clips.items():
        write(HERE / "public" / target / "narration" / f"{scene}.wav", audio, rate)
    print(f"Total narration: {sum(durations.values()):.1f} s")
    out = HERE / "src" / "data" / f"{target}.narration.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"voice": voice, "durations": durations, "beats": starts, "ends": ends}, indent=2))


if __name__ == "__main__":
    main()
