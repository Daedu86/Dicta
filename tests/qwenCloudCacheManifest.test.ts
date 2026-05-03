import { describe, expect, it } from 'vitest';
import { buildQwenCloudCacheManifestFromSemanticPhrases, qwenCloudCacheManifestJson } from '../src/inputs/qwenCloud/qwenCloudCacheManifest';

describe('qwenCloudCacheManifest', () => {
  it('builds a JSON manifest with non-empty phrases', () => {
    const semanticPhrases = [
      {
        id: 'p01',
        text: 'Welcome to Dicta.',
        language: 'en',
        boundaryType: 'sentence',
        canPauseAfter: true,
        canReplayIndependently: true,
        semanticCompleteness: 0.9,
        difficulty: 0.4,
        wordCount: 3,
        charCount: 16,
        punctuationLoad: 0.2,
        rareWordLoad: 0,
        syntaxComplexity: 0.2,
      },
    ] as const;

    const manifest = buildQwenCloudCacheManifestFromSemanticPhrases(semanticPhrases as any, 'en');
    expect(manifest.engine).toBe('qwen-cloud');
    expect(manifest.language).toBe('en');
    expect(manifest.phrases.length).toBe(1);
    expect(manifest.phrases[0].id.startsWith('en:')).toBe(true);

    const parsed = JSON.parse(qwenCloudCacheManifestJson(manifest));
    expect(Array.isArray(parsed.phrases)).toBe(true);
    expect(parsed.phrases[0]).toHaveProperty('id');
    expect(parsed.phrases[0]).toHaveProperty('text');
    expect(parsed.phrases[0]).toHaveProperty('audioUrl');
    expect(parsed.phrases[0]).toHaveProperty('wordCount');
    expect(parsed.phrases[0]).toHaveProperty('charCount');
  });
});

