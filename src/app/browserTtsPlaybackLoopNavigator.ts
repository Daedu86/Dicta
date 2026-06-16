export type BrowserTtsNavigatorInfo = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
};

export function collectBrowserTtsNavigatorInfo(navigatorInfo: Navigator = window.navigator): BrowserTtsNavigatorInfo {
  return {
    userAgent: navigatorInfo.userAgent,
    platform: navigatorInfo.platform,
    maxTouchPoints: navigatorInfo.maxTouchPoints,
  };
}
