export type AdaptiveAdapterCardConfig = {
  inputMode: 'input2' | 'input3' | 'input4';
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
