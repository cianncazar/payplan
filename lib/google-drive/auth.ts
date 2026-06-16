'use client';

const GIS_SCRIPT_ID = 'gis-client-script';
const GIS_SRC = 'https://accounts.google.com/gsi/client';
const SESSION_KEY = 'payplan-gdrive-token';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

// ─── Script loading ───────────────────────────────────────────────────────────

let gisReady: Promise<void> | null = null;

export function loadGIS(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Server context'));

  if (gisReady) return gisReady;

  gisReady = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existing = document.getElementById(GIS_SCRIPT_ID);
    const waitForReady = () => {
      const poll = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(poll);
          resolve();
        }
      }, 50);
      // Timeout after 10 s
      setTimeout(() => {
        clearInterval(poll);
        reject(new Error('Google Identity Services failed to initialise.'));
      }, 10_000);
    };

    if (existing) {
      waitForReady();
      return;
    }

    const script = document.createElement('script');
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SRC;
    script.async = true;
    script.onload = waitForReady;
    script.onerror = () => {
      gisReady = null;
      reject(new Error('Failed to load Google Identity Services. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });

  return gisReady;
}

// ─── Token storage (sessionStorage — cleared when tab closes) ─────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_KEY, token);
  } catch {
    // Silently ignored — private browsing may block sessionStorage writes.
  }
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export function isDriveConnected(): boolean {
  return !!getStoredToken();
}

// ─── OAuth ────────────────────────────────────────────────────────────────────

/**
 * Open the GIS token popup and return the access token.
 * Must be called from a user-gesture handler (click).
 */
export async function requestAccessToken(clientId: string): Promise<string> {
  await loadGIS();

  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description ?? response.error ?? 'No token returned'));
          return;
        }
        storeToken(response.access_token);
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message ?? error.type ?? 'OAuth error'));
      },
    });
    // Empty prompt reuses a cached consent when possible; shows account picker otherwise.
    client.requestAccessToken({ prompt: '' });
  });
}

/**
 * Revoke the current token via Google and clear local storage.
 * Safe to call when disconnected.
 */
export async function revokeAccessToken(): Promise<void> {
  const token = getStoredToken();
  clearStoredToken();

  if (!token) return;

  try {
    await loadGIS();
    await new Promise<void>((resolve) => {
      window.google!.accounts.oauth2.revoke(token, () => resolve());
    });
  } catch {
    // Token revocation is best-effort — local state is already cleared.
  }
}
