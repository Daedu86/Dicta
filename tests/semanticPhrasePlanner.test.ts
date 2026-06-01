import { describe, expect, it } from 'vitest';
import { pickNextPhrase, planSemanticPhrases } from '../src/core/adaptive/SemanticPhrasePlanner';

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

  it('marks German auxiliary-participle split candidates as unsafe', () => {
    const phrases = planSemanticPhrases(
      'Heute müssen wir haben gelernt weil diese Übung viele klare Beispiele für langsames Hören enthält und später endet.',
      'de',
      'short',
    );

    expect(phrases[0]?.boundaryType).toBe('unsafe');
    expect(phrases[0]?.canPauseAfter).toBe(false);
  });

  it.each([
    ['es', 'Hoy mismo yo se lo dije porque esta práctica necesita muchas palabras antes del final completo.'],
    ['fr', 'Aujourd’hui vraiment je ne le savais parce que cette pratique demande plusieurs mots avant la fin complète.'],
    ['pt', 'Hoje mesmo eu se o disse porque esta prática precisa de várias palavras antes do final completo.'],
  ])('marks unsafe pronoun/function-word split candidates for %s', (language, text) => {
    const phrases = planSemanticPhrases(text, language, 'short');

    expect(phrases[0]?.boundaryType).toBe('unsafe');
    expect(phrases[0]?.canPauseAfter).toBe(false);
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
