"""Checks a rendered video for blank or broken frames.

Reads every frame (shrunk to 160 pixels wide, in gray) and flags:
  - blank frames: almost no detail in the middle of the frame, which is what a 3D canvas
    that drew nothing looks like against the cream backdrop (fades are expected to look
    like this, so pass their frame ranges with --fades to skip them);
  - glitches: a single frame that differs sharply from both neighbors while the neighbors
    match each other, like a flash, a missing object, or a frame from somewhere else.

Usage: .venv/bin/python tools/check_frames.py out/video.mp4 [--fades 0-10,640-660]
Exits 1 if anything is flagged.
"""
import argparse
import json
import subprocess
import sys

import numpy as np


def frames(path, width=160):
    probe = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", path], capture_output=True, check=True).stdout)
    w, h = probe["streams"][0]["width"], probe["streams"][0]["height"]
    height = round(h * width / w)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", f"scale={width}:{height}", "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, height, width).astype(np.float32)


def ranges(text):
    out = []
    for part in filter(None, (text or "").split(",")):
        a, b = part.split("-")
        out.append((int(a), int(b)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--fades", default="", help="frame ranges to skip for the blank check, like 0-10,640-660")
    args = ap.parse_args()
    v = frames(args.video)
    n, h, w = v.shape
    skip = ranges(args.fades)
    middle = v[:, h // 5 : h * 3 // 5, w // 6 : w * 5 // 6]
    detail = middle.std(axis=(1, 2))
    diff = np.abs(np.diff(v, axis=0)).mean(axis=(1, 2))  # diff[i] is between frames i and i + 1
    blank = [i for i in range(n) if detail[i] < 6 and not any(a <= i <= b for a, b in skip)]
    glitch = []
    for i in range(1, n - 1):
        around = np.abs(v[i + 1] - v[i - 1]).mean()
        if diff[i - 1] > 6 and diff[i] > 6 and around < 0.35 * min(diff[i - 1], diff[i]):
            glitch.append(i)
    print(f"{n} frames. Detail in the middle: min {detail.min():.1f}, median {np.median(detail):.1f}. Largest change between frames: {diff.max():.1f} at frame {int(diff.argmax()) + 1}.")
    print(f"Blank frames outside fades: {blank[:40]}{' ...' if len(blank) > 40 else ''}")
    print(f"One-frame glitches: {glitch[:40]}{' ...' if len(glitch) > 40 else ''}")
    sys.exit(1 if blank or glitch else 0)


if __name__ == "__main__":
    main()
