'use client';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
const SESSION_KEY = 'payplan-gdrive-token';
const CALLBACK_COOKIE = 'gdrive_token';

// ─── Token storage ────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}

function storeToken(token: string): void {
  try { sessionStorage.setItem(SESSION_KEY, token); } catch {}
}

export function clearStoredToken(): void {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

export function isDriveConnected(): boolean {
  return !!getStoredToken();
}

// ─── OAuth callback cookie ────────────────────────────────────────────────────

/**
 * Reads the short-lived cookie deposited by /api/auth/google/callback,
 * moves the token into sessionStorage, and clears the cookie.
 * Returns true if a token was found and stored.
 */
export function readAndClearCallbackToken(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)gdrive_token=([^;]+)/);
  if (!match) return false;
  storeToken(decodeURIComponent(match[1]));
  document.cookie = `${CALLBACK_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  return true;
}

/** Returns true if the OAuth callback cookie is present (before it is consumed). */
export function hasCallbackCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${CALLBACK_COOKIE}=`);
}

// ─── PKCE OAuth redirect ──────────────────────────────────────────────────────

/**
 * Redirects the browser to Google OAuth using PKCE (Authorization Code + S256).
 * The code_verifier is round-tripped in the state parameter so the server-side
 * callback route can use it for the token exchange.
 * Must be called from a user-gesture handler.
 */
export async function initiateOAuthRedirect(clientId: string): Promise<void> {
  const { generateCodeVerifier, generateCodeChallenge } = await import('./pkce');
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  const state = btoa(JSON.stringify({ verifier, n: crypto.randomUUID() }));
  const redirectUri = `${window.location.origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: DRIVE_SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    state,
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// ─── Revoke ───────────────────────────────────────────────────────────────────

export async function revokeAccessToken(): Promise<void> {
  const token = getStoredToken();
  clearStoredToken();
  if (!token) return;
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  } catch {
    // Best-effort — local state is already cleared.
  }
}
