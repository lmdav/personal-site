// Checks that the narration says what the script says, before anyone listens to it.
// whisper.cpp transcribes every beat of every scene's clip, and a line whose words do not
// match its "speak" text fails. This is the check that was done by hand on 2026-11-02,
// when Kokoro said "romaine" so that it transcribed as "ramen".
// Usage: node tools/check-narration.mjs <slug> [--script <narration.json>]
// --script compares the audio with a different script, to show a mismatch being caught.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const videoDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** whisper.cpp's English base model: WHISPER_MODEL, or the usual download places. */
export function findModel() {
  const places = [process.env.WHISPER_MODEL, path.join(videoDir, "models", "ggml-base.en.bin"), path.join(homedir(), ".cache", "whisper-cpp", "ggml-base.en.bin"), path.join(homedir(), ".local", "share", "whisper", "ggml-base.en.bin")];
  const found = places.find((p) => p && existsSync(p));
  if (!found) throw new Error(`No whisper.cpp model found. Set WHISPER_MODEL, or download ggml-base.en.bin into video/models/ (looked in: ${places.filter(Boolean).join(", ")})`);
  return found;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** A whole number in words, as the script spells it: 57 is "fifty seven". */
export function numberWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${numberWords(n % 100)}` : ""}`;
  if (n < 1_000_000) return `${numberWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${numberWords(n % 1000)}` : ""}`;
  return String(n)
    .split("")
    .map((d) => ONES[Number(d)])
    .join(" ");
}

// Words a listener cannot tell apart, which the transcriber picks between freely.
const SOUND_ALIKE = { two: "to", too: "to", four: "for", won: "one", ate: "eight" };

/** What a line sounds like, for comparing: lowercase words, numbers spelled out, a dot
 * between letters said as "dot", sound-alikes folded together, and the spaces dropped, so
 * "L M Dav" matches "LMDav" and "in two halves" matches "into halves". */
export function sounds(text) {
  return text
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ") // [BLANK_AUDIO], (music)
    .replace(/(\d),(?=\d{3}\b)/g, "$1")
    .replace(/([a-z0-9])\.(?=[a-z])/g, "$1 dot ")
    .replace(/°/g, " degrees ")
    .replace(/\d+/g, (n) => ` ${numberWords(Number(n))} `)
    .replace(/['’]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => SOUND_ALIKE[w] ?? w)
    .join("");
}

/** Whether what was heard matches what the script says. A line with no words never
 * matches, so silence cannot pass for an empty script line. */
export const matches = (said, heard) => sounds(said) !== "" && sounds(said) === sounds(heard);

/** Transcribes part of a WAV (seconds) with whisper.cpp. */
function transcribe(wav, from, to, model, scratch) {
  const clip = path.join(scratch, "line.wav");
  // whisper.cpp wants 16 kHz mono; a little silence either side helps it with short lines.
  const cut = spawnSync("ffmpeg", ["-v", "error", "-y", "-ss", from.toFixed(3), "-to", to.toFixed(3), "-i", wav, "-af", "adelay=300|300,apad=pad_dur=0.3", "-ar", "16000", "-ac", "1", clip], { encoding: "utf8", timeout: 60_000 });
  if (cut.error) throw new Error(`ffmpeg could not run (${cut.error.message}); install it with: brew install ffmpeg`);
  if (cut.status !== 0) throw new Error(`ffmpeg could not cut ${wav}: ${cut.stderr}`);
  const run = spawnSync("whisper-cli", ["-m", model, "-f", clip, "-l", "en", "-nt", "-np"], { encoding: "utf8", timeout: 120_000 });
  if (run.error) throw new Error(`whisper-cli could not start (${run.error.message}); install it with: brew install whisper-cpp`);
  if (run.status !== 0) throw new Error(`whisper-cli failed on ${wav}: ${run.stderr.slice(-400)}`);
  return run.stdout.replace(/\s+/g, " ").trim();
}

/** Checks every beat of a recipe's narration. script: the narration script to compare
 * with; timings: what narrate.py recorded. Returns one line per beat and the failures. */
export function checkNarration({ slug, script, timings, model = findModel() }) {
  const scratch = mkdtempSync(path.join(tmpdir(), "narration-check-"));
  const lines = [];
  const failures = [];
  try {
    for (const [scene, beats] of Object.entries(script)) {
      const starts = timings.beats?.[scene];
      const ends = timings.ends?.[scene];
      if (!starts || !ends) throw new Error(`No beat times for scene "${scene}"; run narrate.py ${slug}`);
      if (starts.length !== beats.length) throw new Error(`Scene "${scene}" has ${beats.length} beats in the script but ${starts.length} in its narration; run narrate.py ${slug}`);
      const wav = path.join(videoDir, "public", slug, "narration", `${scene}.wav`);
      beats.forEach(({ speak }, i) => {
        const heard = transcribe(wav, starts[i], ends[i], model, scratch);
        const ok = matches(speak, heard);
        lines.push(`${ok ? "ok  " : "FAIL"} ${scene} ${i}: ${heard}`);
        if (!ok) failures.push(`${scene}, beat ${i}: the script says "${speak}", whisper heard "${heard}"`);
      });
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  return { lines, failures };
}

// Run directly: check one recipe's narration and exit 1 on any mismatch.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [slug, flag, scriptPath] = process.argv.slice(2);
  if (!slug || (flag && flag !== "--script") || (flag && !scriptPath)) {
    console.error("Usage: node tools/check-narration.mjs <slug> [--script <narration.json>]");
    process.exit(1);
  }
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  const script = read(scriptPath ?? path.join(videoDir, "src", "recipes", `${slug}.narration.json`));
  const timings = read(path.join(videoDir, "src", "data", `${slug}.narration.json`));
  const { lines, failures } = checkNarration({ slug, script, timings });
  console.log(lines.join("\n"));
  if (failures.length) {
    console.error(`\n${failures.length} line${failures.length === 1 ? "" : "s"} did not match:\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`\nEvery line matches the script.`);
}
