import type { MetadataRoute } from 'next';

/** Bez `start_url` celowo: domyślnie to adres strony, z której trener dodał skrót — z sekretem w ścieżce
 * (`/t/<sekret>/kalendarz`). Stałe `start_url: '/'` otwierałoby ekran „Wejdź przez link" zamiast kalendarza. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kanał Klubu — UKS Banino',
    short_name: 'UKS Banino',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
