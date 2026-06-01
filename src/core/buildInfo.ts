export type DictaBuildInfo = {
  branch: string;
  commitSha: string;
  shortCommitSha: string;
  commitTimestamp: string;
  commitMessage: string;
  buildTimestamp: string;
};

export function buildBuildInfoLabel(info: DictaBuildInfo): string {
  const branch = info.branch.trim() || 'local';
  const commit = info.shortCommitSha.trim() || 'unknown';
  const timestamp = formatBuildInfoTimestamp(info.commitTimestamp || info.buildTimestamp);
  return `${branch} commit: ${commit} \u00b7 ${timestamp}`;
}

export function buildBuildInfoTitle(info: DictaBuildInfo): string {
  const branch = info.branch.trim() || 'local';
  const commitSha = info.commitSha.trim() || 'unknown';
  const commitTimestamp = formatBuildInfoTimestamp(info.commitTimestamp);
  const buildTimestamp = formatBuildInfoTimestamp(info.buildTimestamp);
  return [
    `Branch: ${branch}`,
    `Commit: ${commitSha}`,
    `Commit timestamp: ${commitTimestamp}`,
    `Build timestamp: ${buildTimestamp}`,
    info.commitMessage.trim() ? `Message: ${info.commitMessage.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatBuildInfoTimestamp(value: string): string {
  if (!value) return 'unavailable';
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'unavailable';
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}
