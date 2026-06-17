import type { Metadata } from 'next';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { SettingsActions } from '@/components/settings/settings-actions';
import { PreferencesForm } from '@/components/settings/preferences-form';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Currency, locale, theme, and planner defaults.
        </p>
      </div>

      {/* Theme */}
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Currency, locale, planner defaults */}
      <PreferencesForm />

      {/* Tour and sample data */}
      <SettingsActions />
    </div>
  );
}
