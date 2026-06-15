import { afterEach, describe, expect, it } from 'vitest';
import {
  DELETED_SESSION_IDS_KEY,
  DELETED_SESSION_IDS_PERSIST_LIMIT,
  loadDeletedSessionIds,
  persistDeletedSessionIds,
} from '../src/app/sessionPersistenceDeletedIds';

afterEach(() => {
  window.localStorage.clear();
});

describe('sessionPersistenceDeletedIds', () => {
  it('returns an empty set when storage is empty', () => {
    expect([...loadDeletedSessionIds()]).toEqual([]);
  });

  it('returns an empty set for invalid JSON or non-array payloads', () => {
    window.localStorage.setItem(DELETED_SESSION_IDS_KEY, '{not-json');
    expect([...loadDeletedSessionIds()]).toEqual([]);

    window.localStorage.setItem(DELETED_SESSION_IDS_KEY, JSON.stringify({ deleted: ['session-1'] }));
    expect([...loadDeletedSessionIds()]).toEqual([]);
  });

  it('keeps only non-empty string ids from stored arrays', () => {
    window.localStorage.setItem(
      DELETED_SESSION_IDS_KEY,
      JSON.stringify(['session-1', '', null, 42, 'session-2', false]),
    );

    expect([...loadDeletedSessionIds()]).toEqual(['session-1', 'session-2']);
  });

  it('persists truthy ids and caps the deleted-id history', () => {
    const ids = new Set(Array.from({ length: DELETED_SESSION_IDS_PERSIST_LIMIT + 3 }, (_, index) => `session-${index}`));
    ids.add('');

    persistDeletedSessionIds(ids);

    const persisted = JSON.parse(window.localStorage.getItem(DELETED_SESSION_IDS_KEY) ?? '[]') as string[];
    expect(persisted).toHaveLength(DELETED_SESSION_IDS_PERSIST_LIMIT);
    expect(persisted[0]).toBe('session-3');
    expect(persisted.at(-1)).toBe(`session-${DELETED_SESSION_IDS_PERSIST_LIMIT + 2}`);
    expect(persisted).not.toContain('');
  });
});
