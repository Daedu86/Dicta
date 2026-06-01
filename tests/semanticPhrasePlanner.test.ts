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
