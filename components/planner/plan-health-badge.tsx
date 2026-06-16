import { CheckCircle2, AlertTriangle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';
import type { PlanHealth } from '@/types';

const CONFIG: Record<
  PlanHealth,
  { label: string; icon: React.ReactNode; className: string }
> = {
  on_track: {
    label: 'On Track',
    icon: <CheckCircle2 className="h-4 w-4" aria-hidden />,
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  tight: {
    label: 'Tight',
    icon: <AlertTriangle className="h-4 w-4" aria-hidden />,
    className: 'text-amber-600 dark:text-amber-400',
  },
  shortfall: {
    label: 'Shortfall',
    icon: <XCircle className="h-4 w-4" aria-hidden />,
    className: 'text-destructive',
  },
  overdue: {
    label: 'Overdue',
    icon: <AlertCircle className="h-4 w-4" aria-hidden />,
    className: 'text-destructive',
  },
  not_enough_data: {
    label: 'Not Enough Data',
    icon: <HelpCircle className="h-4 w-4" aria-hidden />,
    className: 'text-muted-foreground',
  },
};

export function PlanHealthBadge({ health }: { health: PlanHealth }) {
  const { label, icon, className } = CONFIG[health];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${className}`}>
      {icon}
      {label}
    </span>
  );
}
