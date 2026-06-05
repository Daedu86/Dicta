// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingHeader } from '../src/components/training/TrainingHeader';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function languageButtons(): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.training-header-language-tab'));
}

beforeEach(() => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe('TrainingHeader', () => {
  it('renders the five global language buttons and reports selections', () => {
    const changes = vi.fn();

    act(() => {
      root.render(createElement(TrainingHeader, {
        selectedLanguage: 'de',
        onChangeLanguage: changes,
        onBackToApp: () => undefined,
      }));
    });

    const buttons = languageButtons();
    expect(buttons.map((button) => button.textContent)).toEqual(['EN', 'ES', 'DE', 'FR', 'PT']);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false']);

    act(() => {
      buttons[3].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(changes).toHaveBeenCalledWith('fr');
  });
});
