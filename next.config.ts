import type { NextConfig } from 'next';

/** Nagłówki bezpieczeństwa dla całej appki. Link trenera (`/t/<sekret>`) to jedyna „autoryzacja", więc:
 * `Referrer-Policy: same-origin` — sekret z URL-a nie wycieka w `Referer` do serwisów, do których trener
 * kliknie z appki; `X-Frame-Options: DENY` — nikt nie osadzi formularza w ramce (clickjacking);
 * `X-Content-Type-Options: nosniff` — przeglądarka nie zgaduje typu pobieranych plików. */
const nextConfig: NextConfig = {
  serverExternalPackages: ['sharp', '@resvg/resvg-js', 'satori'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'same-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

export default nextConfig;
