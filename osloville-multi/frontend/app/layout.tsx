import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OSLOVILLE — Live Cozy Map Social',
  description: 'Be on the map. Literally. A cozy FarmVille-style social world on real Oslo with Supabase multiplayer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
