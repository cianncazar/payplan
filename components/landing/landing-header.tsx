'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#benefits', label: 'Features' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link href="/landing" className="text-lg font-semibold tracking-tight text-foreground">
          PayPlan
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Landing page navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/" className={cn(buttonVariants({ size: 'sm' }), 'hidden md:inline-flex')}>
            Start Planning
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-3" aria-label="Mobile navigation">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-2 w-full justify-center')}
            >
              Start Planning
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
