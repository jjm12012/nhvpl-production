import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
// Warm serif display face for public-site headings (see globals.css)
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'NHVPL — New Haven Pickleball League',
  description: 'Register for New Haven Pickleball League events. Spring 2026 season registration now open.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable} ${inter.className}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
