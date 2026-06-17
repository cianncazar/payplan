'use client';

export function DashboardHeader() {
  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
    </div>
  );
}
