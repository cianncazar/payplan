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
        <Link
          href="/landing"
          className="text-lg font-semibold tracking-tight text-foreground transition-opacity duration-200 hover:opacity-80"
        >
          PayPlan
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Landing page navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
              {/* Animated underline */}
              <span
                className="absolute -bottom-0.5 left-0 h-px w-0 bg-foreground transition-all duration-300 group-hover:w-full"
                aria-hidden
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: 'sm' }),
              'hidden transition-transform duration-200 hover:scale-[1.04] active:scale-[0.96] md:inline-flex'
            )}
          >
            Start Planning
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="rounded-md p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground md:hidden"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Menu
                className={cn(
                  'absolute h-5 w-5 transition-all duration-200',
                  mobileOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'
                )}
                aria-hidden
              />
              <X
                className={cn(
                  'absolute h-5 w-5 transition-all duration-200',
                  mobileOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'
                )}
                aria-hidden
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu — slide down */}
      <div
        className={cn(
          'overflow-hidden border-t border-border bg-background transition-all duration-300 ease-in-out md:hidden',
          mobileOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
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
    </header>
  );
}
