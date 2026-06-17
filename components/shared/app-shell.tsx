'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  Wallet,
  CalendarCheck,
  CalendarDays,
  GitCompare,
  Download,
  Settings,
  Shield,
  MoreHorizontal,
  Banknote,
  PiggyBank,
  Coins,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { OnboardingTour } from '@/components/shared/onboarding-tour';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

const primaryNav: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/payments', label: 'Payments', icon: CreditCard },
  { href: '/income', label: 'Income', icon: Wallet },
  { href: '/planner', label: 'Planner', icon: CalendarCheck },
];

const secondaryNav: NavItem[] = [
  { href: '/cash-sources', label: 'Cash Sources', icon: Banknote },
  { href: '/allowance', label: 'Allowance', icon: PiggyBank },
  { href: '/savings', label: 'Savings', icon: Coins },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/scenarios', label: 'Scenarios', icon: GitCompare },
  { href: '/backup', label: 'Backup', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/privacy', label: 'Privacy', icon: Shield },
];

const allNav = [...primaryNav, ...secondaryNav];

function NavLink({
  item,
  onClick,
  compact = false,
}: {
  item: NavItem;
  onClick?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
        compact && 'flex-col gap-1 px-2 py-1.5 text-xs'
      )}
    >
      <Icon className={cn('shrink-0', compact ? 'size-5' : 'size-4')} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function DesktopSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
          PayPlan
        </span>
      </div>
      <nav aria-label="Main navigation" className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
        <hr className="my-1 border-sidebar-border" />
        <div className="flex flex-col gap-0.5">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>
      </nav>
      <div className="flex items-center justify-between border-t border-sidebar-border px-3 py-2">
        <span className="text-xs text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t border-border bg-background md:hidden"
    >
      {primaryNav.map((item) => (
        <NavLink key={item.href} item={item} compact />
      ))}
      <MoreMenu />
    </nav>
  );
}

function MoreMenu() {
  const pathname = usePathname();
  const isMoreActive = secondaryNav.some((item) => item.href === pathname);

  return (
    <Sheet>
      <SheetTrigger
        aria-label="More navigation options"
        className={cn(
          'flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isMoreActive ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
        <span>More</span>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>More</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-2 p-4">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} compact />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/landing') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <DesktopSidebar />
      <main
        id="main-content"
        className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0"
      >
        {children}
      </main>
      <MobileBottomNav />
      <OnboardingTour />
    </div>
  );
}

export { allNav };
