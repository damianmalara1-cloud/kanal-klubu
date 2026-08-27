import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', 'src', 'creative', 'assets');
const files = [
  'fonts/Anton-Regular.ttf', 'fonts/Barlow-Regular.ttf', 'fonts/Barlow-Medium.ttf',
  'fonts/Barlow-SemiBold.ttf', 'fonts/Barlow-Bold.ttf',
  'logo/uks-banino-logo-primary.svg', 'logo/uks-banino-logo-mono-white.svg',
  'logo/uks-banino-crest.svg', 'logo/uks-banino-crest-mono-white.svg',
  'partnerzy/klub-pro-white.png', 'partnerzy/fundacja-msit-set-white.png',
];
const entries = files.map((f) => `  ${JSON.stringify(f)}: ${JSON.stringify(readFileSync(join(root, f)).toString('base64'))},`);
const out = `// WYGENEROWANE przez scripts/embed-assets.mjs — nie edytować ręcznie\nexport const ASSETS = {\n${entries.join('\n')}\n} as const;\nexport type AssetName = keyof typeof ASSETS;\n`;
mkdirSync(join(here, '..', 'src', 'creative'), { recursive: true });
writeFileSync(join(here, '..', 'src', 'creative', 'assets.generated.ts'), out);
console.log(`embed-assets: ${files.length} plików`);
