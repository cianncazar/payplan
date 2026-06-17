'use client';

import { BookOpen, Database, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';
import { useTourStore } from '@/stores/tour-store';
import { isDatabaseEmpty, seedSampleData } from '@/lib/sample-data/seed';

export function SettingsActions() {
  const { open } = useTourStore();
  const [seeding, setSeeding] = useState(false);

  function handleRestartTour() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.tourCompleted);
    } catch { /* ignore */ }
    open();
  }

  async function handleLoadSample() {
    setSeeding(true);
    try {
      const empty = await isDatabaseEmpty();
      if (!empty) {
        toast.info('Sample data can only be loaded into an empty database. Clear all data first from the Backup page.');
        return;
      }
      await seedSampleData();
      toast.success('Sample data loaded.');
    } catch {
      toast.error('Failed to load sample data.');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="rounded-lg border border-border divide-y divide-border">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium">App tour</p>
          <p className="text-xs text-muted-foreground">Replay the getting-started walkthrough</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRestartTour}>
          <BookOpen className="mr-1.5 h-3.5 w-3.5" />
          Restart tour
        </Button>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-medium">Sample data</p>
          <p className="text-xs text-muted-foreground">Load demo data into an empty database</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLoadSample} disabled={seeding}>
          {seeding ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Database className="mr-1.5 h-3.5 w-3.5" />
          )}
          Load sample data
        </Button>
      </div>
    </div>
  );
}
