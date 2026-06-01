import { describe, expect, it } from 'vitest';
import { buildBuildInfoLabel, buildBuildInfoTitle, type DictaBuildInfo } from '../src/core/buildInfo';

const baseInfo: DictaBuildInfo = {
  branch: 'main',
  commitSha: 'abcdef1234567890',
  shortCommitSha: 'abcdef1',
  commitTimestamp: '2026-06-01T15:00:00.000Z',
  commitMessage: 'Test commit',
  buildTimestamp: '2026-06-01T15:01:00.000Z',
};

describe('buildInfo', () => {
  it('builds a compact branch and short SHA label', () => {
    expect(buildBuildInfoLabel(baseInfo)).toBe('main@abcdef1');
  });

  it('falls back when branch or short SHA fields are missing', () => {
    expect(buildBuildInfoLabel({ ...baseInfo, branch: '', shortCommitSha: '' })).toBe('local@abcdef1');
    expect(buildBuildInfoLabel({ ...baseInfo, commitSha: '', shortCommitSha: '' })).toBe('main@unknown');
  });

  it('builds a multiline title with safe fallbacks', () => {
    const title = buildBuildInfoTitle({
      ...baseInfo,
      commitSha: '',
      commitTimestamp: '',
    });

    expect(title).toContain('Branch: main');
    expect(title).toContain('Commit: abcdef1');
    expect(title).toContain('Commit time: unknown');
    expect(title).toContain('Commit message: Test commit');
    expect(title).toContain('Build time: 2026-06-01T15:01:00.000Z');
  });
});
