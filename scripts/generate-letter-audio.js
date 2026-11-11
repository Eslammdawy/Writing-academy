const fs = require('fs');
const path = require('path');

const AUDIO_DIR = path.join(__dirname, '..', 'assets', 'audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

function createToneWav(notes, sampleRate = 22050) {
  const totalDuration = notes.reduce((acc, n) => acc + n.duration, 0);
  const numSamples = Math.floor(sampleRate * totalDuration);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  let sampleIdx = 0;
  for (const note of notes) {
    const nSamples = Math.floor(sampleRate * note.duration);
    for (let i = 0; i < nSamples && sampleIdx < numSamples; i++, sampleIdx++) {
      const t = i / sampleRate;
      const env = Math.min(1, i / (sampleRate * 0.012)) * Math.exp(-3.2 * (t / note.duration));
      const wave =
        0.7 * Math.sin(2 * Math.PI * note.freq * t) +
        0.2 * Math.sin(2 * Math.PI * note.freq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * note.freq * 1.5 * t);
      const val = Math.max(-1, Math.min(1, wave * env * 0.5));
      buf.writeInt16LE(Math.floor(val * 32767), 44 + sampleIdx * 2);
    }
  }
  return buf;
}

const scaleFreqs = [
  261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99,
];

// Generate 26 English letter WAVs (en_A.wav .. en_Z.wav)
for (let i = 0; i < 26; i++) {
  const ch = String.fromCharCode(65 + i);
  const f1 = scaleFreqs[i % scaleFreqs.length];
  const f2 = scaleFreqs[(i + 2) % scaleFreqs.length];
  const wav = createToneWav([
    { freq: f1, duration: 0.11 },
    { freq: f2, duration: 0.17 },
  ]);
  fs.writeFileSync(path.join(AUDIO_DIR, `en_${ch}.wav`), wav);
}

// Generate 28 Arabic letter WAVs (ar_01.wav .. ar_28.wav)
for (let i = 1; i <= 28; i++) {
  const id = String(i).padStart(2, '0');
  const f1 = scaleFreqs[(i + 1) % scaleFreqs.length];
  const f2 = scaleFreqs[(i + 4) % scaleFreqs.length];
  const wav = createToneWav([
    { freq: f1, duration: 0.11 },
    { freq: f2, duration: 0.17 },
  ]);
  fs.writeFileSync(path.join(AUDIO_DIR, `ar_${id}.wav`), wav);
}

console.log('Generated 54 bundled letter WAV files in assets/audio/');
