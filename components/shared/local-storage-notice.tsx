'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { AlertCircleIcon, XIcon } from 'lucide-react';
import { LOCAL_STORAGE_KEYS } from '@/lib/constants';

const KEY = LOCAL_STORAGE_KEYS.noticesDismissed;

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot() {
  try {
    return !localStorage.getItem(KEY);
  } catch {
    return true;
  }
}

// Server snapshot: don't show during SSR to avoid hydration mismatch.
function getServerSnapshot() {
  return false;
}

export default function LocalStorageNotice() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      // ignore
    }
    // Notify subscribers so useSyncExternalStore re-reads the snapshot.
    window.dispatchEvent(new Event('storage'));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="flex-1">
        Your plan is stored only in this browser. Clearing browser data, using private
        browsing, or moving to another device may remove it.{' '}
        <a
          href="/backup"
          className="font-medium underline underline-offset-2 hover:text-foreground"
        >
          Export a backup
        </a>{' '}
        if you want to keep a copy.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="mt-0.5 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
