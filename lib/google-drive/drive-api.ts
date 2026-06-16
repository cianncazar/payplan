'use client';

import type { PayPlanBackup } from '@/types';

const BASE = 'https://www.googleapis.com';
export const BACKUP_FILENAME = 'payplan-backup.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DriveFile = {
  id: string;
  name: string;
  modifiedTime: string;
};

export class DriveApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly tokenExpired: boolean
  ) {
    super(message);
    this.name = 'DriveApiError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function driveRequest(
  path: string,
  token: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new DriveApiError(
      `Drive API ${res.status}: ${body.slice(0, 200)}`,
      res.status,
      res.status === 401
    );
  }

  return res;
}

/**
 * Build a multipart/related body per the Drive API upload spec.
 * Uses a unique boundary each call to avoid collisions.
 */
function buildMultipartBody(
  metadata: Record<string, unknown>,
  content: string,
  boundary: string
): string {
  return (
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`
  );
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** List files in appDataFolder matching the backup filename. */
export async function findBackupFile(token: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,modifiedTime)',
    q: `name='${BACKUP_FILENAME}'`,
    pageSize: '1',
  });

  const res = await driveRequest(
    `/drive/v3/files?${params.toString()}`,
    token
  );

  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files?.[0] ?? null;
}

/**
 * Upload or overwrite the PayPlan backup in appDataFolder.
 * Returns the file's Drive ID and server-side modifiedTime.
 */
export async function uploadBackup(
  token: string,
  backup: PayPlanBackup,
  existingFileId?: string
): Promise<DriveFile> {
  const boundary = `payplan_${Date.now()}`;
  const content = JSON.stringify(backup, null, 2);

  const metadata: Record<string, unknown> = existingFileId
    ? { name: BACKUP_FILENAME }
    : { name: BACKUP_FILENAME, parents: ['appDataFolder'] };

  const body = buildMultipartBody(metadata, content, boundary);

  const uploadPath = existingFileId
    ? `/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,modifiedTime`
    : `/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const res = await driveRequest(uploadPath, token, {
    method,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  return (await res.json()) as DriveFile;
}

/** Download and parse the raw text of a Drive file by ID. */
export async function downloadFileContent(token: string, fileId: string): Promise<string> {
  const res = await driveRequest(
    `/drive/v3/files/${fileId}?alt=media`,
    token
  );
  return res.text();
}

/** Delete a Drive file by ID. No-op if the file does not exist (404). */
export async function deleteFile(token: string, fileId: string): Promise<void> {
  try {
    await driveRequest(`/drive/v3/files/${fileId}`, token, { method: 'DELETE' });
  } catch (err) {
    if (err instanceof DriveApiError && err.status === 404) return;
    throw err;
  }
}
