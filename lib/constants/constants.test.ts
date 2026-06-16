import { describe, it, expect } from 'vitest';
import {
  PAYMENT_CATEGORIES,
  PAYMENT_CATEGORY_LABELS,
  PLANNER_STRATEGIES,
  PLANNER_STRATEGY_LABELS,
  DEFAULT_SETTINGS,
  BACKUP_FORMAT,
  BACKUP_VERSION,
} from './index';

describe('PAYMENT_CATEGORIES', () => {
  it('has 14 categories', () => {
    expect(PAYMENT_CATEGORIES).toHaveLength(14);
  });

  it('every category has a label', () => {
    for (const cat of PAYMENT_CATEGORIES) {
      expect(PAYMENT_CATEGORY_LABELS[cat]).toBeTruthy();
    }
  });
});

describe('PLANNER_STRATEGIES', () => {
  it('has 7 strategies', () => {
    expect(PLANNER_STRATEGIES).toHaveLength(7);
  });

  it('every strategy has a label', () => {
    for (const s of PLANNER_STRATEGIES) {
      expect(PLANNER_STRATEGY_LABELS[s]).toBeTruthy();
    }
  });
});

describe('DEFAULT_SETTINGS', () => {
  it('has id local-settings', () => {
    expect(DEFAULT_SETTINGS.id).toBe('local-settings');
  });

  it('defaults to PHP currency', () => {
    expect(DEFAULT_SETTINGS.defaultCurrency).toBe('PHP');
  });

  it('defaults to deadline_first strategy', () => {
    expect(DEFAULT_SETTINGS.defaultStrategy).toBe('deadline_first');
  });

  it('setupCompleted is false', () => {
    expect(DEFAULT_SETTINGS.setupCompleted).toBe(false);
  });
});

describe('backup constants', () => {
  it('format is payplan-backup', () => {
    expect(BACKUP_FORMAT).toBe('payplan-backup');
  });

  it('version is 1', () => {
    expect(BACKUP_VERSION).toBe(1);
  });
});
