// Generates the extension icons. Run: node tools/make-icons.js
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const SIZES = [16, 32, 48, 128];
const BRAND = [0x25, 0x63, 0xeb];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

function render(size) {
  const SS = 4;
  const n = size * SS;
  const radius = n * 0.22;

  const insideSquare = (x, y) => {
    const cx = Math.min(Math.max(x, radius), n - radius);
    const cy = Math.min(Math.max(y, radius), n - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius;
  };

  const ax = n * 0.37;
  const ay = n * 0.28;
  const bx = n * 0.37;
  const by = n * 0.72;
  const cx = n * 0.72;
  const cy = n * 0.5;
  const side = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);

  const insideTriangle = (x, y) => {
    const d1 = side(x, y, ax, ay, bx, by);
    const d2 = side(x, y, bx, by, cx, cy);
    const d3 = side(x, y, cx, cy, ax, ay);
    return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  };

  const rgba = Buffer.alloc(size * size * 4);
  const samples = SS * SS;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let covered = 0;
      let white = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px * SS + sx + 0.5;
          const y = py * SS + sy + 0.5;
          if (!insideSquare(x, y)) continue;
          covered++;
          if (insideTriangle(x, y)) white++;
        }
      }

      const alpha = covered / samples;
      const offset = (py * size + px) * 4;
      if (alpha === 0) continue;

      const whiteShare = white / samples;
      const brandShare = alpha - whiteShare;
      for (let channel = 0; channel < 3; channel++) {
        rgba[offset + channel] = Math.round(
          (BRAND[channel] * brandShare + 255 * whiteShare) / alpha
        );
      }
      rgba[offset + 3] = Math.round(alpha * 255);
    }
  }

  return rgba;
}

mkdirSync('icons', { recursive: true });
for (const size of SIZES) {
  writeFileSync(`icons/icon-${size}.png`, encodePng(size, render(size)));
  console.log(`icons/icon-${size}.png`);
}
