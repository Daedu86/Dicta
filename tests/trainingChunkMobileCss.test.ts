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

  it('keeps the per-chunk submit row in normal flow on phones', () => {
    const responsiveCss = readRepoSource('src/styles/responsive-640.css');

    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-action-row {',
      'margin: 0.5rem -0.15rem -0.1rem;',
      'background: transparent;',
    ]);
    expect(responsiveCss).not.toContain('position: sticky;');
    expect(responsiveCss).toContain('.training-input-card .training-chunk-action-row p');
    expect(responsiveCss).toContain('display: none;');
  });

  it('keeps the active chunk in page flow while reserving keyboard scroll room', () => {
    const responsiveCss = readRepoSource('src/styles/responsive-640.css');

    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-flow-keyboard-active {',
      'padding-bottom: calc(',
      'var(--training-visual-keyboard-inset, 0px)',
      'scroll-margin-bottom: calc(',
    ]);
    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-flow-keyboard-active .training-chunk-card-active {',
      'display: grid;',
      'grid-template-rows: auto minmax(0, auto) auto;',
    ]);
    expect(responsiveCss).not.toContain('position: fixed;');
    expect(responsiveCss).toContain('height: clamp(4.75rem, 15dvh, 6rem);');
    expect(responsiveCss).toContain('max-height: 6rem;');
    expectInOrder(responsiveCss, [
      '.training-input-card .training-chunk-flow-keyboard-active .training-chunk-action-row {',
      'margin: 0.5rem 0 0;',
      'scroll-margin-bottom: calc(',
    ]);
  });
});
