export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super('VALIDATION_ERROR', message, fieldErrors);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} not found: ${id}` : `${resource} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class CalculationError extends AppError {
  constructor(message: string) {
    super('CALCULATION_ERROR', message);
    this.name = 'CalculationError';
  }
}

export class StorageError extends AppError {
  constructor(message: string, public readonly cause?: unknown) {
    super('STORAGE_ERROR', message);
    this.name = 'StorageError';
  }
}

export class BackupFormatError extends AppError {
  constructor(message: string) {
    super('BACKUP_FORMAT_ERROR', message);
    this.name = 'BackupFormatError';
  }
}

export class UnsupportedBackupVersionError extends AppError {
  constructor(version: unknown) {
    super(
      'UNSUPPORTED_BACKUP_VERSION',
      `Backup version ${String(version)} is not supported by this app version.`
    );
    this.name = 'UnsupportedBackupVersionError';
  }
}

export function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const message =
    err instanceof Error ? err.message : 'An unexpected storage error occurred.';
  return new StorageError(message, err);
}
