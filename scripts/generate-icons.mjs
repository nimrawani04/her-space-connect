import fs from "node:fs";

console.log("HerSpace icons are rendered from public/favicon.svg (5-petal blooming sakura flower).");
const files = [
  "public/favicon.ico",
  "public/favicon.png",
  "public/favicon.svg",
  "public/apple-touch-icon.png",
  "public/apple-touch-icon-precomposed.png",
  "public/app-icon.png",
  "public/icon-192.png",
  "public/icon-512.png"
];

for (const f of files) {
  if (fs.existsSync(f)) {
    console.log(`✓ ${f} (${fs.statSync(f).size} bytes)`);
  } else {
    console.warn(`! Missing ${f}`);
  }
}
