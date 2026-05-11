/**
 * Čita public/wing.png, belu (i bledo sivu) pozadinu pretvara u transparentnu,
 * čuva kao public/wing-no-background.png (PNG – JPEG ne podržava transparentnost).
 * Pokretanje: node scripts/wing-remove-white.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const inputPath = path.join(__dirname, '..', 'public', 'wing.png');
const outputPath = path.join(__dirname, '..', 'public', 'wing-no-background.png');

// Prag: pikseli svetliji od ovoga postaju transparentni (0–255)
const WHITE_THRESHOLD = 248;

async function main() {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const len = data.length;

  for (let i = 0; i < len; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isWhite = r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD;
    if (isWhite) {
      data[i + 3] = 0; // alpha = 0
    }
  }

  await sharp(data, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log('Sačuvano:', outputPath);
  console.log('Možeš preuzeti: public/wing-no-background.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
