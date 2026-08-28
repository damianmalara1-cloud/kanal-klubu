import satori, { type SatoriOptions } from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ReactElement, ReactNode } from 'react';
import { asset } from './assets';

export const W = 1080, H = 1350;

let fonts: SatoriOptions['fonts'] | null = null;
function getFonts(): SatoriOptions['fonts'] {
  fonts ??= [
    { name: 'Anton', data: asset('fonts/Anton-Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Barlow', data: asset('fonts/Barlow-Regular.ttf'), weight: 400, style: 'normal' },
    { name: 'Barlow', data: asset('fonts/Barlow-Medium.ttf'), weight: 500, style: 'normal' },
    { name: 'Barlow', data: asset('fonts/Barlow-SemiBold.ttf'), weight: 600, style: 'normal' },
    { name: 'Barlow', data: asset('fonts/Barlow-Bold.ttf'), weight: 700, style: 'normal' },
  ];
  return fonts;
}

/** Renderuje element React na PNG 1080×1350 przez satori (SVG) + resvg (rasteryzacja). */
export async function renderPng(element: ReactNode): Promise<Buffer> {
  const svg = await satori(element as ReactElement, { width: W, height: H, fonts: getFonts() });
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng());
}
