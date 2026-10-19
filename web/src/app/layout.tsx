import type { Metadata, Viewport } from 'next';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/archivo/700.css';
import '@fontsource/archivo/800.css';
import '@fontsource/archivo/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/silkscreen/700.css';
import './globals.css';
import { CONFIG } from '@/lib/config';

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.SHARE_BASE_URL),
  title: 'Gno Wrapped',
  description: 'Your Mainnet Season 1 on gno.land, unwrapped.',
};

export const viewport: Viewport = {
  themeColor: '#0A1030',
  viewportFit: 'cover',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    // gw-js is added before first paint so scroll-reveal content starts hidden without a flash;
    // without JS nothing is hidden.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('gw-js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
