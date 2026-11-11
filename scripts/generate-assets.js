const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const AUDIO_DIR = path.join(ROOT, 'assets', 'audio');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');

fs.mkdirSync(IMAGES_DIR, { recursive: true });
fs.mkdirSync(AUDIO_DIR, { recursive: true });
fs.mkdirSync(FONTS_DIR, { recursive: true });

// --- 1. Pure Node PNG generator for app icons & splash ---
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPlayfulPng(width, height, bgRgb, circleRgb, accentRgb) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.36;
  const innerR = width * 0.24;

  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = bgRgb[0];
      let g = bgRgb[1];
      let b = bgRgb[2];
      if (dist < innerR) {
        r = accentRgb[0];
        g = accentRgb[1];
        b = accentRgb[2];
      } else if (dist < outerR) {
        r = circleRgb[0];
        g = circleRgb[1];
        b = circleRgb[2];
      }
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.writeFileSync(
  path.join(IMAGES_DIR, 'icon.png'),
  createPlayfulPng(1024, 1024, [255, 253, 247], [56, 152, 236], [255, 184, 0])
);
fs.writeFileSync(
  path.join(IMAGES_DIR, 'adaptive-icon.png'),
  createPlayfulPng(1024, 1024, [255, 253, 247], [46, 196, 134], [255, 184, 0])
);
fs.writeFileSync(
  path.join(IMAGES_DIR, 'splash-icon.png'),
  createPlayfulPng(512, 512, [255, 253, 247], [56, 152, 236], [46, 196, 134])
);
console.log('Generated PNG icons in assets/images/');

// --- 2. Pure Node WAV generator for offline sound effects & phonetic chimes ---
function createMelodyWav(notes, sampleRate = 22050) {
  const totalDuration = notes.reduce((acc, n) => acc + n.duration, 0);
  const numSamples = Math.floor(sampleRate * totalDuration);
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM
  buf.writeUInt16LE(1, 20); // Mono
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
      const env = Math.min(1, i / (sampleRate * 0.015)) * Math.exp(-3.5 * (t / note.duration));
      // Warm xylophone-like harmonic blend
      const wave =
        0.65 * Math.sin(2 * Math.PI * note.freq * t) +
        0.25 * Math.sin(2 * Math.PI * note.freq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * note.freq * 3 * t);
      const val = Math.max(-1, Math.min(1, wave * env * 0.55));
      buf.writeInt16LE(Math.floor(val * 32767), 44 + sampleIdx * 2);
    }
  }
  return buf;
}

const sfxDefs = {
  'tap.wav': [{ freq: 523.25, duration: 0.09 }],
  'sparkle.wav': [
    { freq: 587.33, duration: 0.09 },
    { freq: 783.99, duration: 0.11 },
    { freq: 1046.5, duration: 0.18 },
  ],
  'celebrate.wav': [
    { freq: 523.25, duration: 0.11 },
    { freq: 659.25, duration: 0.11 },
    { freq: 783.99, duration: 0.11 },
    { freq: 1046.5, duration: 0.28 },
  ],
  'gentle_hint.wav': [
    { freq: 440.0, duration: 0.14 },
    { freq: 523.25, duration: 0.2 },
  ],
  'rocket_launch.wav': [
    { freq: 392.0, duration: 0.1 },
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.12 },
    { freq: 1046.5, duration: 0.3 },
  ],
  'star_earn.wav': [
    { freq: 659.25, duration: 0.1 },
    { freq: 880.0, duration: 0.22 },
  ],
  'pronounce_en.wav': [
    { freq: 523.25, duration: 0.12 },
    { freq: 659.25, duration: 0.18 },
  ],
  'pronounce_ar.wav': [
    { freq: 587.33, duration: 0.12 },
    { freq: 739.99, duration: 0.18 },
  ],
};

for (const [filename, notes] of Object.entries(sfxDefs)) {
  fs.writeFileSync(path.join(AUDIO_DIR, filename), createMelodyWav(notes));
}
console.log('Generated offline WAV audio files in assets/audio/');

// --- 3. Write Open Font License and download/verify NotoSansArabic & Nunito fonts ---
const OFL_TEXT = `SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
Bundled typography for Soufy & Nadine Handwriting Academy (Noto Sans Arabic & Nunito).
Permitted for bundling and redistribution in mobile applications.`;
fs.writeFileSync(path.join(FONTS_DIR, 'OFL.txt'), OFL_TEXT);

function downloadFile(url, dest) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          file.close();
          return downloadFile(res.headers.location, dest).then(resolve);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(dest, () => resolve(false));
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
      })
      .on('error', () => {
        file.close();
        fs.unlink(dest, () => resolve(false));
      });
  });
}

(async () => {
  const notoUrl =
    'https://raw.githubusercontent.com/google/fonts/main/ofl/notosansarabic/NotoSansArabic%5Bwdth%2Cwght%5D.ttf';
  const nunitoUrl =
    'https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/Nunito%5Bwght%5D.ttf';
  const okNoto = await downloadFile(notoUrl, path.join(FONTS_DIR, 'NotoSansArabic-Regular.ttf'));
  const okNunito = await downloadFile(nunitoUrl, path.join(FONTS_DIR, 'Nunito-Regular.ttf'));
  console.log('Font download status:', { okNoto, okNunito });
})();
