export type DictaBuildInfo = {
  branch: string;
  commitSha: string;
  shortCommitSha: string;
  commitTimestamp: string;
  commitMessage: string;
  buildTimestamp: string;
};

export function buildBuildInfoLabel(info: DictaBuildInfo): string {
  const branch = normalizeBuildInfoPart(info.branch, 'local');
  const shortSha = normalizeBuildInfoPart(info.shortCommitSha || info.commitSha.slice(0, 7), 'unknown');
  return `${branch}@${shortSha}`;
}

export function buildBuildInfoTitle(info: DictaBuildInfo): string {
  return [
    ['Branch', info.branch],
    ['Commit', info.commitSha || info.shortCommitSha],
    ['Commit time', info.commitTimestamp],
    ['Commit message', info.commitMessage],
    ['Build time', info.buildTimestamp],
  ]
    .map(([label, value]) => `${label}: ${normalizeBuildInfoPart(value, 'unknown')}`)
    .join('\n');
}

function normalizeBuildInfoPart(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized || fallback;
}
