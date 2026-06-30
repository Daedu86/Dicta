import { describe, expect, it } from 'vitest';
import { expectInOrder, readRepoSource } from './helpers/sourceOrderExpectations';

describe('mobile chunk practice CSS', () => {
  it('loads the phone override after chunk styles so the active chunk textarea stays compact', () => {
    const indexCss = readRepoSource('src/styles/index.css');
    const responsiveCss = readRepoSource('src/styles/responsive-640.css');

    expectInOrder(indexCss, [
      "@import './training-chunks.css';",
      "@import './responsive-640.css';",
    ]);
    expect(responsiveCss).toContain('.training-input-card .training-chunk-card-active textarea');
    expect(responsiveCss).toContain('height: clamp(6.5rem, 20vh, 8.5rem);');
    expect(responsiveCss).toContain('height: clamp(6.5rem, 20dvh, 8.5rem);');
    expect(responsiveCss).toContain('max-height: 8.5rem;');
  });

  it('keeps the per-chunk submit row sticky and visible on phones', () => {
    const responsiveCss = readRepoSource('src/styles/responsive-640.css');

    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-action-row {',
      'position: sticky;',
      'bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem);',
    ]);
    expect(responsiveCss).toContain('.training-input-card .training-chunk-action-row p');
    expect(responsiveCss).toContain('display: none;');
  });

  it('docks the whole active chunk card above the visual keyboard while typing', () => {
    const responsiveCss = readRepoSource('src/styles/responsive-640.css');

    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-flow-keyboard-active .training-chunk-card-active {',
      'position: fixed;',
      'var(--training-visual-keyboard-inset, 0px)',
      'max-width: calc(640px - 1.3rem);',
      'max-height: calc(var(--training-visual-viewport-height, 100dvh) - 0.75rem);',
      'grid-template-rows: auto minmax(0, auto) auto;',
    ]);
    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-flow-keyboard-active .training-chunk-action-row {',
      'position: static;',
      'margin: 0.5rem 0 0;',
    ]);
  });
});
