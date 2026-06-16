'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { AlertCircle, Info } from 'lucide-react';
import type { OccurrencePreview } from '@/lib/calculations/occurrences';
import { formatMoney } from '@/lib/money';

interface SchedulePreviewProps {
  previews: OccurrencePreview[];
  currency?: string;
  isEstimate?: boolean;
  /** Max rows to show before "show more". */
  maxRows?: number;
}

/**
 * Compact schedule preview table shown inside the payment form.
 * Renders an estimate notice when `isEstimate` is true.
 */
export function SchedulePreview({
  previews,
  currency = 'PHP',
  isEstimate = false,
  maxRows = 12,
}: SchedulePreviewProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (previews.length === 0) return null;

  const visible = expanded ? previews : previews.slice(0, maxRows);
  const hasMore = previews.length > maxRows;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Info className="size-3.5 shrink-0" aria-hidden="true" />
        <span>Schedule preview ({previews.length} payment{previews.length !== 1 ? 's' : ''})</span>
        {isEstimate && (
          <span className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Estimate
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border text-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Due date</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
              {previews.some((p) => p.interestAmountMinor !== undefined) && (
                <th className="hidden px-3 py-2 text-right font-medium text-muted-foreground sm:table-cell">
                  Interest
                </th>
              )}
              {previews.some((p) => p.feeAmountMinor > 0) && (
                <th className="hidden px-3 py-2 text-right font-medium text-muted-foreground sm:table-cell">
                  Fee
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const dueDate = new Date(p.dueDate + 'T00:00:00');
              const isPast = dueDate < new Date();
              return (
                <tr
                  key={p.sequenceNumber}
                  className="border-b border-border last:border-0 odd:bg-background even:bg-muted/20"
                >
                  <td className="px-3 py-1.5 tabular-nums text-muted-foreground">
                    {p.sequenceNumber + 1}
                  </td>
                  <td className={`px-3 py-1.5 tabular-nums ${isPast ? 'text-muted-foreground line-through' : ''}`}>
                    {format(dueDate, 'MMM d, yyyy')}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                    {formatMoney(p.dueAmountMinor, currency)}
                    {p.amountIsEstimate && (
                      <span className="ml-0.5 text-muted-foreground" aria-label="estimated">*</span>
                    )}
                  </td>
                  {previews.some((pr) => pr.interestAmountMinor !== undefined) && (
                    <td className="hidden px-3 py-1.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {p.interestAmountMinor !== undefined
                        ? formatMoney(p.interestAmountMinor, currency)
                        : '—'}
                    </td>
                  )}
                  {previews.some((pr) => pr.feeAmountMinor > 0) && (
                    <td className="hidden px-3 py-1.5 text-right tabular-nums text-muted-foreground sm:table-cell">
                      {p.feeAmountMinor > 0 ? formatMoney(p.feeAmountMinor, currency) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasMore && !expanded && (
        <button
          type="button"
          className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          onClick={() => setExpanded(true)}
        >
          Show {previews.length - maxRows} more…
        </button>
      )}

      {isEstimate && (
        <p className="text-xs text-muted-foreground">
          * Amounts are estimates based on the information you entered. Confirm with your lender.
        </p>
      )}
    </div>
  );
}
