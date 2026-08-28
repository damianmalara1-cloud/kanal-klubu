import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
export default async function () {
  mkdirSync('tests/e2e/fixtures', { recursive: true });
  const jpg = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 210, g: 130, b: 60 } } }).jpeg().toBuffer();
  writeFileSync('tests/e2e/fixtures/foto.jpg', jpg);
}
