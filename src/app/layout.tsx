import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const anton = localFont({ src: '../creative/assets/fonts/Anton-Regular.ttf', weight: '400', variable: '--font-display-next', display: 'swap' });
const barlow = localFont({
  src: [
    { path: '../creative/assets/fonts/Barlow-Regular.ttf', weight: '400' },
    { path: '../creative/assets/fonts/Barlow-Medium.ttf', weight: '500' },
    { path: '../creative/assets/fonts/Barlow-SemiBold.ttf', weight: '600' },
    { path: '../creative/assets/fonts/Barlow-Bold.ttf', weight: '700' },
  ],
  variable: '--font-text-next', display: 'swap',
});

export const metadata: Metadata = { title: 'Kanał Klubu — UKS Banino', robots: { index: false, follow: false } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pl" className={`${anton.variable} ${barlow.variable}`}><body>{children}</body></html>;
}
