'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudUpload,
  Download,
  Loader2,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { exportBackup } from '@/lib/backup/export';
import {
  parseBackupFile,
  getBackupPreview,
  importBackupReplace,
  importBackupMerge,
  type BackupPreview,
} from '@/lib/backup/import';
import type { ValidatedBackup } from '@/lib/backup/schemas';
import {
  isDriveConnected,
  hasCallbackCookie,
  readAndClearCallbackToken,
  initiateOAuthRedirect,
  revokeAccessToken,
  getStoredToken,
} from '@/lib/google-drive/auth';
import {
  findBackupFile,
  uploadBackup,
  downloadFileContent,
  DriveApiError,
  type DriveFile,
} from '@/lib/google-drive/drive-api';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.driveLastBackupAt);
  } catch {
    return null;
  }
}

function setLastBackupAt(iso: string): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.driveLastBackupAt, iso);
  } catch {
    // ignore
  }
}

function formatBackupTime(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return format(parseISO(iso), 'MMM d, yyyy \'at\' h:mm a');
  } catch {
    return iso;
  }
}

/**
 * Wrap every Drive call so that a 401 (token expired) is surfaced
 * as a disconnect rather than an unhandled error.
 */
async function withTokenRefresh<T>(
  fn: (token: string) => Promise<T>,
  onExpired: () => void
): Promise<T> {
  const token = getStoredToken();
  if (!token) {
    onExpired();
    throw new Error('Not connected to Google Drive.');
  }
  try {
    return await fn(token);
  } catch (err) {
    if (err instanceof DriveApiError && err.tokenExpired) {
      onExpired();
      throw new Error('Google Drive session expired. Please reconnect.');
    }
    throw err;
  }
}

// ─── Preview table (reuses backup page pattern) ───────────────────────────────

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

function DriveBackupPreview({
  preview,
  driveFile,
}: {
  preview: BackupPreview;
  driveFile: DriveFile;
}) {
  const total = Object.values(preview.counts).reduce((s, n) => s + n, 0);
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Drive backup</span>
        <span className="text-xs text-muted-foreground">
          Modified {format(parseISO(driveFile.modifiedTime), 'MMM d, yyyy')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {(Object.entries(preview.counts) as [keyof BackupPreview['counts'], number][]).map(
          ([key, count]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-muted-foreground">{PREVIEW_LABELS[key]}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </div>
          )
        )}
      </div>
      <div className="border-t border-border pt-2 text-xs font-medium">
        Total records: {total}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Phase =
  | 'disconnected'
  | 'connecting'
  | 'idle'
  | 'backing_up'
  | 'fetching'
  | 'restore_preview'
  | 'importing'
  | 'disconnecting';

type RestoreMode = 'merge' | 'replace';

const DRIVE_ERROR_MESSAGES: Record<string, string> = {
  not_configured:
    'Google Drive is not configured on this server. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment variables.',
  token_exchange_failed: 'Failed to complete Google sign-in. Please try again.',
  invalid_state: 'Invalid OAuth state. Please try connecting again.',
  missing_params: 'OAuth response was incomplete. Please try again.',
  no_token: 'Google did not return an access token. Please try again.',
};

export function GoogleDriveSection() {
  const [phase, setPhase] = React.useState<Phase>(() => {
    if (isDriveConnected()) return 'idle';
    // Avoid a flash of "disconnected" when the OAuth callback just deposited a token cookie.
    if (hasCallbackCookie()) return 'idle';
    return 'disconnected';
  });
  const [lastBackupAt, setLastBackupAtState] = React.useState<string | null>(getLastBackupAt);

  // Restore-preview state
  const [driveFile, setDriveFile] = React.useState<DriveFile | null>(null);
  const [preview, setPreview] = React.useState<BackupPreview | null>(null);
  const [validated, setValidated] = React.useState<ValidatedBackup | null>(null);
  const [restoreMode, setRestoreMode] = React.useState<RestoreMode>('merge');
  const [confirmReplace, setConfirmReplace] = React.useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Consume the OAuth callback cookie and handle any error query param.
  React.useEffect(() => {
    readAndClearCallbackToken();

    const params = new URLSearchParams(window.location.search);
    const driveError = params.get('drive_error');
    if (driveError) {
      setError(DRIVE_ERROR_MESSAGES[driveError] ?? `Connection error: ${driveError}`);
      setPhase('disconnected');
      const url = new URL(window.location.href);
      url.searchParams.delete('drive_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  function handleExpired() {
    revokeAccessToken().catch(() => {});
    setPhase('disconnected');
    setError('Your Google Drive session expired. Please reconnect.');
  }

  // ─── Connect ────────────────────────────────────────────────────────────────

  async function handleConnect() {
    if (!CLIENT_ID) return;
    setPhase('connecting');
    setError(null);
    try {
      await initiateOAuthRedirect(CLIENT_ID);
      // Browser navigates away — code below is never reached in normal flow.
    } catch (err) {
      setPhase('disconnected');
      setError(err instanceof Error ? err.message : 'Connection failed.');
    }
  }

  // ─── Disconnect ─────────────────────────────────────────────────────────────

  async function handleDisconnect() {
    setConfirmDisconnect(false);
    setPhase('disconnecting');
    try {
      await revokeAccessToken();
    } finally {
      setPhase('disconnected');
      setError(null);
    }
  }

  // ─── Backup ─────────────────────────────────────────────────────────────────

  async function handleBackup() {
    setPhase('backing_up');
    setError(null);
    try {
      const backup = await exportBackup();

      const file = await withTokenRefresh(async (token) => {
        const existing = await findBackupFile(token);
        return uploadBackup(token, backup, existing?.id);
      }, handleExpired);

      const now = new Date().toISOString();
      setLastBackupAt(now);
      setLastBackupAtState(now);
      toast.success(
        `Backed up to Google Drive — ${format(parseISO(file.modifiedTime), 'MMM d, h:mm a')}`
      );
      setPhase('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backup failed.';
      setError(msg);
      toast.error(msg);
      setPhase('idle');
    }
  }

  // ─── Restore: fetch from Drive ───────────────────────────────────────────────

  async function handleFetchForRestore() {
    setPhase('fetching');
    setError(null);
    setDriveFile(null);
    setPreview(null);
    setValidated(null);

    try {
      const { file, text } = await withTokenRefresh(async (token) => {
        const f = await findBackupFile(token);
        if (!f) throw new Error('No PayPlan backup found in your Google Drive.');
        const t = await downloadFileContent(token, f.id);
        return { file: f, text: t };
      }, handleExpired);

      // Re-use existing parseBackupFile but feed it a synthetic File object
      const blob = new Blob([text], { type: 'application/json' });
      const syntheticFile = new File([blob], 'payplan-backup.json', { type: 'application/json' });
      const validatedBackup = await parseBackupFile(syntheticFile);

      setDriveFile(file);
      setPreview(getBackupPreview(validatedBackup));
      setValidated(validatedBackup);
      setPhase('restore_preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not read Drive backup.';
      setError(msg);
      toast.error(msg);
      setPhase('idle');
    }
  }

  // ─── Restore: import ────────────────────────────────────────────────────────

  async function handleImport() {
    if (!validated) return;
    setConfirmReplace(false);
    setPhase('importing');
    setError(null);
    try {
      if (restoreMode === 'replace') {
        await importBackupReplace(validated);
        toast.success('Data replaced from Google Drive backup.');
      } else {
        const { inserted, skipped } = await importBackupMerge(validated);
        toast.success(`Merged from Drive: ${inserted} added, ${skipped} skipped.`);
      }
      setPhase('idle');
      setPreview(null);
      setValidated(null);
      setDriveFile(null);
    } catch {
      setError('Import failed. Your existing data has not been changed.');
      toast.error('Import failed. Your existing data has not been changed.');
      setPhase('restore_preview');
    }
  }

  // ─── Not configured ──────────────────────────────────────────────────────────

  if (!CLIENT_ID) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold">Google Drive Backup</h2>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-700 dark:text-amber-300">
            <strong>NEXT_PUBLIC_GOOGLE_CLIENT_ID</strong> is not set. See the README for setup
            instructions.
          </span>
        </div>
      </div>
    );
  }

  // ─── Disconnected ────────────────────────────────────────────────────────────

  if (phase === 'disconnected' || phase === 'connecting') {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-muted-foreground" aria-hidden />
            <h2 className="text-base font-semibold">Google Drive Backup</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Optionally back up your plan to your own Google Drive. Your local data is never
            affected automatically — you control every upload and restore.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button onClick={handleConnect} disabled={phase === 'connecting'}>
          {phase === 'connecting' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Cloud className="mr-2 h-4 w-4" aria-hidden />
          )}
          Connect Google Drive
        </Button>

        <p className="text-xs text-muted-foreground">
          PayPlan requests only the{' '}
          <code className="rounded bg-muted px-1 py-0.5">drive.appdata</code> permission — it
          can only read and write files it creates itself, and cannot access the rest of your
          Drive.
        </p>
      </div>
    );
  }

  // ─── Connected ───────────────────────────────────────────────────────────────

  const busy =
    phase === 'backing_up' ||
    phase === 'fetching' ||
    phase === 'importing' ||
    phase === 'disconnecting';

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className="text-base font-semibold">Google Drive Backup</h2>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Last backup: <span className="font-medium">{formatBackupTime(lastBackupAt)}</span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmDisconnect(true)}
          disabled={busy}
          className="shrink-0 text-muted-foreground"
        >
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden />
          Disconnect
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Restore preview — stays visible while importing */}
      {(phase === 'restore_preview' || phase === 'importing') && preview && driveFile && (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Drive backup validated.
          </div>

          <DriveBackupPreview preview={preview} driveFile={driveFile} />

          <div className="space-y-2">
            <p className="text-sm font-medium">Import mode</p>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="drive-restore-mode"
                value="merge"
                checked={restoreMode === 'merge'}
                onChange={() => setRestoreMode('merge')}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">Merge</span>
                <p className="text-xs text-muted-foreground">
                  Add records from the Drive backup that don&apos;t already exist locally.
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="radio"
                name="drive-restore-mode"
                value="replace"
                checked={restoreMode === 'replace'}
                onChange={() => setRestoreMode('replace')}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium">Replace all local data</span>
                <p className="text-xs text-muted-foreground">
                  Delete everything locally and restore exactly what is in the Drive backup. This
                  cannot be undone.
                </p>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {restoreMode === 'replace' ? (
              <Button
                variant="destructive"
                onClick={() => setConfirmReplace(true)}
                disabled={phase === 'importing'}
              >
                {phase === 'importing' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                Replace all local data
              </Button>
            ) : (
              <Button onClick={handleImport} disabled={phase === 'importing'}>
                {phase === 'importing' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                )}
                Merge into current data
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setPhase('idle');
                setPreview(null);
                setValidated(null);
                setDriveFile(null);
                setError(null);
              }}
              disabled={phase === 'importing'}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Idle actions */}
      {phase !== 'restore_preview' && phase !== 'importing' && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleBackup} disabled={busy}>
            {phase === 'backing_up' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <CloudUpload className="mr-2 h-4 w-4" aria-hidden />
            )}
            Backup to Google Drive
          </Button>

          <Button variant="outline" onClick={handleFetchForRestore} disabled={busy}>
            {phase === 'fetching' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-2 h-4 w-4" aria-hidden />
            )}
            Restore from Google Drive
          </Button>

          {(phase === 'backing_up' || phase === 'fetching') && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground self-center">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {phase === 'backing_up' ? 'Uploading…' : 'Downloading…'}
            </span>
          )}
        </div>
      )}

      {/* Replace confirm */}
      <ConfirmDialog
        open={confirmReplace}
        onOpenChange={setConfirmReplace}
        title="Replace all local data?"
        description="Every payment, income entry, scenario, and setting stored locally will be permanently deleted and replaced with the Google Drive backup. Export a local backup first if you want to keep a copy."
        confirmLabel="Yes, replace everything"
        destructive
        onConfirm={handleImport}
      />

      {/* Disconnect confirm */}
      <ConfirmDialog
        open={confirmDisconnect}
        onOpenChange={setConfirmDisconnect}
        title="Disconnect Google Drive?"
        description="PayPlan will stop having access to your Google Drive. Your local data and any existing Drive backup files are not deleted."
        confirmLabel="Disconnect"
        destructive={false}
        onConfirm={handleDisconnect}
      />
    </div>
  );
}
