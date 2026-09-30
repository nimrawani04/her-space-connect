import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createHerSpacePng(width, height) {
  // Brand colors: warm rose / terracotta gradient (#c86d51 to #e9b4c4) with white monogram 'H'
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

  const rawRows = [];
  const cx = width / 2;
  const cy = height / 2;
  const rOuter = width * 0.45;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const idx = 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient
      const t = (x + y) / (width + height);
      // #ba5338 (186, 83, 56) to #d98877 (217, 136, 119)
      const r = Math.round(186 + (217 - 186) * t);
      const g = Math.round(83 + (136 - 83) * t);
      const b = Math.round(56 + (119 - 56) * t);

      // Rounded rect / circle icon badge
      if (dist <= rOuter) {
        // Draw stylized 'H'
        const nx = (x - cx) / (width * 0.5);
        const ny = (y - cy) / (height * 0.5);
        const inLeftBar = nx >= -0.38 && nx <= -0.18 && ny >= -0.45 && ny <= 0.45;
        const inRightBar = nx >= 0.18 && nx <= 0.38 && ny >= -0.45 && ny <= 0.45;
        const inCrossBar = nx >= -0.38 && nx <= 0.38 && ny >= -0.12 && ny <= 0.12;

        if (inLeftBar || inRightBar || inCrossBar) {
          row[idx] = 255;
          row[idx + 1] = 255;
          row[idx + 2] = 255;
          row[idx + 3] = 255;
        } else {
          row[idx] = r;
          row[idx + 1] = g;
          row[idx + 2] = b;
          row[idx + 3] = 255;
        }
      } else {
        // Anti-aliased outer edge
        const edge = dist - rOuter;
        if (edge < 1.5) {
          const alpha = Math.max(0, Math.min(255, Math.round((1.5 - edge) / 1.5 * 255)));
          row[idx] = r;
          row[idx + 1] = g;
          row[idx + 2] = b;
          row[idx + 3] = alpha;
        } else {
          row[idx] = 0;
          row[idx + 1] = 0;
          row[idx + 2] = 0;
          row[idx + 3] = 0;
        }
      }
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData);

  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = writePngChunk("IHDR", ihdr);
  const idatChunk = writePngChunk("IDAT", compressed);
  const iendChunk = writePngChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

const sizes = [
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "public/apple-touch-icon.png", size: 180 },
  { file: "public/favicon.png", size: 32 },
];

for (const { file, size } of sizes) {
  const png = createHerSpacePng(size, size);
  fs.writeFileSync(file, png);
  console.log(`Created ${file} (${png.length} bytes)`);
}
