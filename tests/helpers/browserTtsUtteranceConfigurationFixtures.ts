export function createUtterance(): SpeechSynthesisUtterance {
  return {
    rate: 0,
    pitch: 0,
    volume: 0,
    lang: '',
  } as SpeechSynthesisUtterance;
}

export function createVoice(overrides: Partial<SpeechSynthesisVoice> = {}): SpeechSynthesisVoice {
  return {
    default: false,
    lang: 'de-DE',
    localService: true,
    name: 'Anna',
    voiceURI: 'voice-de',
    ...overrides,
  } as SpeechSynthesisVoice;
}
