import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import Providers from '@/app/providers';
import AppShell from '@/components/shared/app-shell';
import LocalStorageNotice from '@/components/shared/local-storage-notice';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'PayPlan',
    template: '%s — PayPlan',
  },
  description:
    'A privacy-first payment planner. No account required. All data stays in your browser.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <LocalStorageNotice />
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
