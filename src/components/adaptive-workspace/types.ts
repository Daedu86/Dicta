export type AdaptiveAdapterCardConfig = {
  inputMode: string;
  title: string;
  adapter: string;
  execution: string;
  controls: string;
};

export type AdaptiveWorkspaceFocusAnchor = null | 'sessionFeedback' | 'exports';

export type RepeatWordStat = {
  word: string;
  total: number;
  missed: number;
  typos: number;
};
