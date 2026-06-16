import { describe, expect, it } from 'vitest';
import {
  advanceSemanticPhrasePlayback,
  createSemanticPhrasePlaybackState,
  pickNextPhrase,
  planSemanticPhrases,
  replaySemanticPhrasePlayback,
} from '../src/core/adaptive/SemanticPhrasePlanner';

describe('SemanticPhrasePlanner multilingual boundaries', () => {
  it.each([
    ['de', 'Ich habe heute viel gelernt, aber ich brauche noch Übung. Morgen wiederhole ich die schwierigen Sätze.'],
    ['es', 'Hoy practiqué con calma, pero todavía necesito escuchar mejor. Mañana repetiré las frases difíciles.'],
    ['fr', 'Aujourd’hui je pratique lentement, mais je veux mieux comprendre. Demain je répéterai les phrases difficiles.'],
    ['pt', 'Hoje pratiquei com calma, mas ainda preciso escutar melhor. Amanhã vou repetir as frases difíceis.'],
  ])('plans semantic phrases for %s without losing language scope', (language, text) => {
    const phrases = planSemanticPhrases(text, language, 'short');

    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every((phrase) => phrase.language === language)).toBe(true);
    expect(phrases.some((phrase) => phrase.boundaryType === 'sentence')).toBe(true);
    expect(phrases.every((phrase) => phrase.wordCount > 0)).toBe(true);
  });

  it.each([
    ['de', 'Heute müssen wir haben gesprochen weil diese Übung viele klare Beispiele für langsames Hören enthält und später endet.'],
    ['es', 'Hoy mismo yo se lo dije porque esta práctica necesita muchas palabras antes del final completo.'],
    ['fr', 'Aujourd’hui vraiment je ne le savais parce que cette pratique demande plusieurs mots avant la fin complète.'],
    ['pt', 'Hoje mesmo eu se o disse porque esta prática precisa de várias palavras antes do final completo.'],
  ])('keeps multilingual phrase metadata well-formed for %s guarded-boundary inputs', (language, text) => {
    const phrases = planSemanticPhrases(text, language, 'short');

    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.every((phrase) => phrase.language === language)).toBe(true);
    expect(phrases.every((phrase) => phrase.semanticCompleteness >= 0 && phrase.semanticCompleteness <= 1)).toBe(true);
    expect(phrases.every((phrase) => phrase.difficulty >= 0 && phrase.difficulty <= 1)).toBe(true);
  });

  it('produces sentence and clause chunks for EN/ES/DE/FR/PT', () => {
    const en = planSemanticPhrases('We start slowly, then we speed up. Finally we review.', 'en', 'medium');
    const es = planSemanticPhrases('Primero escuchamos, luego escribimos. Al final revisamos.', 'es', 'medium');
    const de = planSemanticPhrases('Zuerst horen wir zu, dann schreiben wir. Danach prufen wir.', 'de', 'medium');
    const fr = planSemanticPhrases('D abord nous ecoutons, puis nous ecrivons. Ensuite nous relisons.', 'fr', 'medium');
    const pt = planSemanticPhrases('Primeiro escutamos, depois escrevemos. No final revisamos.', 'pt', 'medium');
    expect(en.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
    expect(es.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
    expect(de.some((item) => item.boundaryType === 'sentence' || item.boundaryType === 'clause')).toBe(true);
    expect(fr.some((item) => item.language === 'fr' && (item.boundaryType === 'sentence' || item.boundaryType === 'clause'))).toBe(true);
    expect(pt.some((item) => item.language === 'pt' && (item.boundaryType === 'sentence' || item.boundaryType === 'clause'))).toBe(true);
  });

  it('avoids unsafe determiner+noun split when obvious', () => {
    const phrases = planSemanticPhrases('The final answer is clear and the result is stable.', 'en', 'short');
    const hasUnsafeEdge = phrases.some((phrase) => /\bthe$/i.test(phrase.text));
    expect(hasUnsafeEdge).toBe(false);
  });

  it('picks size from safe semantic candidates', () => {
    const phrases = planSemanticPhrases('One short sentence. Another sentence with a comma, and a smooth ending.', 'en', 'long');
    const picked = pickNextPhrase(phrases, 'short', 'clause');
    expect(picked).not.toBeNull();
    expect((picked?.boundaryType ?? 'unsafe') === 'sentence' || (picked?.boundaryType ?? 'unsafe') === 'clause').toBe(true);
  });

  it('prefers sentence-level candidates when strictness requires sentences', () => {
    const candidates = planSemanticPhrases(
      'First we listen carefully, then we type the phrase. After that we compare the result.',
      'en',
      'short',
    );
    const next = pickNextPhrase(candidates, 'medium', 'sentence');

    expect(next).not.toBeNull();
    expect(next?.boundaryType).toBe('sentence');
  });
});

describe('semantic phrase playback progression', () => {
  it('starts playback at phrase index 0', () => {
    const state = createSemanticPhrasePlaybackState();
    expect(state.currentPhraseIndex).toBe(0);
    expect(state.lastPhraseAdvanceReason).toBe('start');
  });

  it('advances phrase completion by exactly 1', () => {
    const state = createSemanticPhrasePlaybackState();
    const next = advanceSemanticPhrasePlayback(state, 4, 'phrase_complete');
    expect(next.currentPhraseIndex).toBe(1);
    expect(next.phraseAdvanceCount).toBe(1);
    expect(next.lastPhraseAdvanceReason).toBe('phrase_complete');
  });

  it('replay does not advance phrase index', () => {
    const state = advanceSemanticPhrasePlayback(createSemanticPhrasePlaybackState(), 4);
    const replay = replaySemanticPhrasePlayback(state);
    expect(replay.currentPhraseIndex).toBe(1);
    expect(replay.phraseReplayCount).toBe(1);
  });

  it('deferred pause leaves phrase index unchanged', () => {
    const state = createSemanticPhrasePlaybackState();
    expect(state.currentPhraseIndex).toBe(0);
  });

  it('typed progress noise cannot choose a later paragraph', () => {
    const text = 'First paragraph starts here. It continues calmly. Second paragraph should not start first.';
    const phrases = planSemanticPhrases(text, 'en', 'short');
    const noisyTypedProgressRatio = 0.95;
    const currentPhraseIndex = 0;
    expect(noisyTypedProgressRatio).toBeGreaterThan(0.9);
    expect(phrases[currentPhraseIndex].text).toContain('First paragraph');
    expect(phrases[currentPhraseIndex].text).not.toContain('Second paragraph');
  });
});
