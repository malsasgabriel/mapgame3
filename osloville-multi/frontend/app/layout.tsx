import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OSLOVILLE — Live Cozy Map Social',
  description: 'Be on the map. Literally. A cozy FarmVille-style social world on real Oslo with Supabase multiplayer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&family=Inter:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
