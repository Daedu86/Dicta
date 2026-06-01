import { describe, expect, it } from 'vitest';
import { buildBuildInfoLabel, buildBuildInfoTitle, type DictaBuildInfo } from '../src/core/buildInfo';

const buildInfo: DictaBuildInfo = {
  branch: ' main ',
  commitSha: ' abcdef123456 ',
  shortCommitSha: ' abcdef1 ',
  commitTimestamp: 'not-a-date',
  commitMessage: ' Initial build ',
  buildTimestamp: '',
};

describe('buildBuildInfoLabel', () => {
  it('formats branch, short commit, and unavailable timestamp', () => {
    expect(buildBuildInfoLabel(buildInfo)).toBe('main commit: abcdef1 \u00b7 unavailable');
  });

  it('falls back to local branch and unknown commit', () => {
    expect(buildBuildInfoLabel({
      ...buildInfo,
      branch: ' ',
      shortCommitSha: ' ',
    })).toBe('local commit: unknown \u00b7 unavailable');
  });
});

describe('buildBuildInfoTitle', () => {
  it('formats build metadata title lines', () => {
    expect(buildBuildInfoTitle(buildInfo)).toBe([
      'Branch: main',
      'Commit: abcdef123456',
      'Commit timestamp: unavailable',
      'Build timestamp: unavailable',
      'Message: Initial build',
    ].join('\n'));
  });

  it('omits an empty commit message', () => {
    expect(buildBuildInfoTitle({
      ...buildInfo,
      commitMessage: ' ',
    })).not.toContain('Message:');
  });
});
