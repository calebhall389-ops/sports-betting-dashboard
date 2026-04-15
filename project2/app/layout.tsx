import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EdgeFinder — Sports Betting Analytics',
  description: 'Live odds comparison, +EV finder, and AI betting recommendations across MLB, NBA, NFL, NHL, and MMA.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950">{children}</body>
    </html>
  );
}
