import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const oauthError = searchParams.get('error');

  // Prefer an explicitly configured app URL; fall back to the request origin.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const backupUrl = `${appUrl}/backup`;

  if (oauthError) {
    if (oauthError === 'access_denied') return NextResponse.redirect(backupUrl);
    return NextResponse.redirect(`${backupUrl}?drive_error=${encodeURIComponent(oauthError)}`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${backupUrl}?drive_error=missing_params`);
  }

  let verifier: string;
  try {
    const decoded = JSON.parse(atob(stateRaw)) as { verifier?: string };
    if (typeof decoded.verifier !== 'string' || !decoded.verifier) throw new Error();
    verifier = decoded.verifier;
  } catch {
    return NextResponse.redirect(`${backupUrl}?drive_error=invalid_state`);
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${backupUrl}?drive_error=not_configured`);
  }

  const redirectUri = `${appUrl}/api/auth/google/callback`;

  let tokenRes: Response;
  try {
    tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
  } catch {
    return NextResponse.redirect(`${backupUrl}?drive_error=token_exchange_failed`);
  }

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${backupUrl}?drive_error=token_exchange_failed`);
  }

  const data = (await tokenRes.json()) as { access_token?: string; expires_in?: number };

  if (!data.access_token) {
    return NextResponse.redirect(`${backupUrl}?drive_error=no_token`);
  }

  const res = NextResponse.redirect(backupUrl);
  res.cookies.set('gdrive_token', data.access_token, {
    httpOnly: false, // The client needs to read this token to call Drive APIs directly.
    sameSite: 'lax',
    maxAge: data.expires_in ?? 3600,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });

  return res;
}
