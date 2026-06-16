'use client';

import { useState, useRef, useCallback } from 'react';
import { Download, Upload, Trash2, FileJson, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/db/database';
import { exportBackup, backupFilename, downloadJSON, exportPaymentsCSV, exportIncomeCSV } from '@/lib/backup/export';
import { parseBackupFile, getBackupPreview, importBackupReplace, importBackupMerge, type BackupPreview } from '@/lib/backup/import';
import type { ValidatedBackup } from '@/lib/backup/schemas';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

// ─── Preview table ────────────────────────────────────────────────────────────

const PREVIEW_LABELS: Record<keyof BackupPreview['counts'], string> = {
  appSettings: 'Settings',
  cashSources: 'Cash sources',
  payments: 'Payments',
  paymentOccurrences: 'Payment occurrences',
  incomeSources: 'Income sources',
  incomeEvents: 'Income events',
  allowanceBudgets: 'Allowance budgets',
  planScenarios: 'Scenarios',
  planAllocations: 'Allocations',
  manualCashAdjustments: 'Manual adjustments',
};

function ImportPreview({ preview }: { preview: BackupPreview }) {
  const total = Object.values(preview.counts).reduce((s, n) => s + n, 0);
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">Backup from {preview.exportedAt.slice(0, 10)}</span>
        <span className="text-xs text-muted-foreground">v{preview.appVersion}</span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {(Object.entries(preview.counts) as [keyof BackupPreview['counts'], number][]).map(([key, count]) => (
          <div key={key} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{PREVIEW_LABELS[key]}</span>
            <span className="font-medium tabular-nums">{count}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 text-xs font-medium">
        Total records: {total}
      </div>
    </div>
  );
}

// ─── Export section ───────────────────────────────────────────────────────────

function ExportSection() {
  const [exporting, setExporting] = useState(false);
  const [exportingPayments, setExportingPayments] = useState(false);
  const [exportingIncome, setExportingIncome] = useState(false);

  const handleExportJSON = useCallback(async () => {
    setExporting(true);
    try {
      const backup = await exportBackup();
      downloadJSON(backup, backupFilename());
      toast.success('Backup exported.');
    } catch {
      toast.error('Failed to export backup.');
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportPaymentsCSV = useCallback(async () => {
    setExportingPayments(true);
    try {
      const [payments, occurrences] = await Promise.all([
        db.payments.toArray(),
        db.paymentOccurrences.toArray(),
      ]);
      exportPaymentsCSV(payments, occurrences);
      toast.success('Payments CSV exported.');
    } catch {
      toast.error('Failed to export payments CSV.');
    } finally {
      setExportingPayments(false);
    }
  }, []);

  const handleExportIncomeCSV = useCallback(async () => {
    setExportingIncome(true);
    try {
      const [sources, events] = await Promise.all([
        db.incomeSources.toArray(),
        db.incomeEvents.toArray(),
      ]);
      exportIncomeCSV(sources, events);
      toast.success('Income CSV exported.');
    } catch {
      toast.error('Failed to export income CSV.');
    } finally {
      setExportingIncome(false);
    }
  }, []);

  return (
    <Section
      title="Export"
      description="Download a copy of your local data. Your browser data is not changed."
    >
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleExportJSON} disabled={exporting} variant="default">
          {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
          Export JSON backup
        </Button>
        <Button onClick={handleExportPaymentsCSV} disabled={exportingPayments} variant="outline">
          {exportingPayments ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Export payments CSV
        </Button>
        <Button onClick={handleExportIncomeCSV} disabled={exportingIncome} variant="outline">
          {exportingIncome ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Export income CSV
        </Button>
      </div>
    </Section>
  );
}

// ─── Import section ───────────────────────────────────────────────────────────

function ImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [validated, setValidated] = useState<ValidatedBackup | null>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('merge');
  const [importing, setImporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidated(null);
    setPreview(null);
    setParseError(null);

    try {
      const backup = await parseBackupFile(file);
      setValidated(backup);
      setPreview(getBackupPreview(backup));
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Unknown error reading file.');
    }

    // Reset so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    if (!validated) return;
    setImporting(true);
    setConfirmOpen(false);
    try {
      if (mode === 'replace') {
        await importBackupReplace(validated);
        toast.success('Data replaced successfully.');
      } else {
        const { inserted, skipped } = await importBackupMerge(validated);
        toast.success(`Merged: ${inserted} added, ${skipped} skipped (already existed).`);
      }
      setValidated(null);
      setPreview(null);
    } catch {
      toast.error('Import failed. Your existing data has not been changed.');
    } finally {
      setImporting(false);
    }
  }, [validated, mode]);

  return (
    <Section
      title="Import"
      description="Restore data from a previously exported PayPlan backup file (.json)."
    >
      <div className="space-y-4">
        {/* File picker */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-input"
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose backup file
          </Button>
        </div>

        {/* Parse error */}
        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Preview */}
        {preview && validated && (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              File validated successfully.
            </div>

            <ImportPreview preview={preview} />

            {/* Import mode */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Import mode</p>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium">Merge</span>
                  <p className="text-xs text-muted-foreground">
                    Add records from the backup that don&apos;t already exist. Your current data is kept.
                  </p>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="import-mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-medium">Replace all data</span>
                  <p className="text-xs text-muted-foreground">
                    Delete everything and restore exactly what is in the backup file. This cannot be undone.
                  </p>
                </div>
              </label>
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={importing}
              variant={mode === 'replace' ? 'destructive' : 'default'}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'replace' ? 'Replace all data' : 'Merge into current data'}
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={mode === 'replace' ? 'Replace all data?' : 'Merge backup?'}
        description={
          mode === 'replace'
            ? 'This will permanently delete all your current data and replace it with the backup. Export a backup first if you want to keep a copy.'
            : `This will add ${preview?.counts ? Object.values(preview.counts).reduce((s, n) => s + n, 0) : ''} records from the backup. Records that already exist will be skipped.`
        }
        confirmLabel={mode === 'replace' ? 'Yes, replace everything' : 'Yes, merge'}
        destructive={mode === 'replace'}
        onConfirm={handleImport}
      />
    </Section>
  );
}

// ─── Reset section ────────────────────────────────────────────────────────────

function ResetSection() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleReset = useCallback(async () => {
    setResetting(true);
    try {
      // Import resetAllData lazily to avoid bundling it in the initial chunk
      const { resetAllData } = await import('@/lib/backup/import');
      await resetAllData();
      toast.success('All local data has been deleted.');
    } catch {
      toast.error('Reset failed. Please try again.');
    } finally {
      setResetting(false);
    }
  }, []);

  return (
    <Section
      title="Reset"
      description="Permanently delete all your local planning data. Export a backup first."
    >
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-sm text-amber-700 dark:text-amber-300">
          This action cannot be undone. All payments, income, scenarios, and settings
          will be permanently removed from this browser.
        </p>
      </div>

      <div className="mt-4">
        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
          disabled={resetting}
        >
          {resetting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Delete all local data
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete all local data?"
        description="Every payment, income entry, scenario, and setting stored in this browser will be permanently deleted. This cannot be undone. Make sure you have exported a backup first."
        confirmLabel="Yes, delete everything"
        destructive
        onConfirm={handleReset}
      />
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BackupPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backup</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Export, import, and reset your local planning data.
        </p>
      </div>

      {/* Local-storage notice */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Download className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Your plan is stored only in this browser. Clearing browser data, using private
          browsing, or changing devices may remove it. Export a backup to keep a copy.
        </p>
      </div>

      <ExportSection />
      <ImportSection />
      <ResetSection />
    </div>
  );
}
