'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { CashFlowPoint } from '@/types';
import { formatMoney } from '@/lib/money';

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
}

function formatTickMoney(value: number): string {
  const major = value / 100;
  if (Math.abs(major) >= 1_000) return `₱${(major / 1_000).toFixed(0)}k`;
  return `₱${major.toFixed(0)}`;
}

export function CashFlowChart({
  timeline,
  cashBufferMinor = 0,
}: {
  timeline: CashFlowPoint[];
  cashBufferMinor?: number;
}) {
  if (timeline.length === 0) return null;

  const data = timeline.map((p) => ({
    date: formatDate(p.date),
    balance: p.closingBalanceMinor,
  }));

  const hasNegative = timeline.some((p) => p.closingBalanceMinor < 0);

  // Give each data point at least 32 px so labels don't overlap when scrolling.
  const minChartWidth = Math.max(480, data.length * 32);

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold">Cash Flow</h2>
      <div className="overflow-x-auto">
      <div style={{ minWidth: minChartWidth }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={formatTickMoney}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value) => [typeof value === 'number' ? formatMoney(value) : String(value), 'Balance']}
            labelFormatter={(label) => `Date: ${label}`}
            contentStyle={{
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--card)',
              color: 'var(--card-foreground)',
              fontSize: 12,
            }}
          />
          {cashBufferMinor > 0 && (
            <ReferenceLine
              y={cashBufferMinor}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 2"
              label={{
                value: 'Buffer',
                position: 'insideTopLeft',
                fontSize: 10,
                fill: 'var(--muted-foreground)',
              }}
            />
          )}
          {hasNegative && (
            <ReferenceLine y={0} stroke="var(--destructive)" strokeDasharray="2 2" />
          )}
          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--primary)"
            fill="url(#cashGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
