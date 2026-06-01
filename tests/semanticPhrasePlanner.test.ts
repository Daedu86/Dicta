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

  it('marks German auxiliary-participle splits as unsafe when the cut would separate them', () => {
    const phrases = planSemanticPhrases('Wir haben gelernt weil wir fleißig waren.', 'de', 'short');

    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.some((phrase) => phrase.boundaryType === 'unsafe' || phrase.canPauseAfter === false)).toBe(true);
  });

  it.each([
    ['es', 'Yo se lo dije porque era importante.'],
    ['fr', 'Je ne le savais pas parce que personne ne parlait.'],
    ['pt', 'Eu separei as notas porque elas eram importantes.'],
  ])('avoids unsafe pronoun/function-word breaks for %s', (language, text) => {
    const phrases = planSemanticPhrases(text, language, 'short');

    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.some((phrase) => phrase.boundaryType === 'unsafe' || phrase.canPauseAfter === false)).toBe(true);
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
