import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/outfit/wght.css';
import '@fontsource-variable/figtree/wght.css';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Reset Pharmacy — a fresh start to feeling better', template: '%s · Reset Pharmacy' },
  description: 'Pharmacy care, wellness products and clear guidance. Order everyday health essentials online, send a prescription for pharmacist review and follow your order.',
  applicationName: 'Reset Pharmacy',
  openGraph: { siteName: 'Reset Pharmacy', type: 'website', locale: 'en_NG' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: '#00b86b', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
