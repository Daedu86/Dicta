import type { DictaBuildInfo } from '../core/buildInfo';

declare const __DICTA_BUILD_INFO__: DictaBuildInfo | undefined;

const FALLBACK_DICTA_BUILD_INFO: DictaBuildInfo = {
  branch: '',
  commitSha: '',
  shortCommitSha: '',
  commitTimestamp: '',
  commitMessage: '',
  buildTimestamp: '',
};

export const DICTA_BUILD_INFO: DictaBuildInfo =
  typeof __DICTA_BUILD_INFO__ === 'undefined'
    ? FALLBACK_DICTA_BUILD_INFO
    : __DICTA_BUILD_INFO__;
