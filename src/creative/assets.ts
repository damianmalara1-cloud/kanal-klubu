import { ASSETS, type AssetName } from './assets.generated';

const MIME: Record<string, string> = { ttf: 'font/ttf', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg' };

export type { AssetName };
export function asset(name: AssetName): Buffer {
  return Buffer.from(ASSETS[name], 'base64');
}
export function assetDataUri(name: AssetName): string {
  const ext = name.split('.').pop() ?? '';
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${ASSETS[name]}`;
}
