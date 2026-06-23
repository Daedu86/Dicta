// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingHeader } from '../src/components/training/TrainingHeader';
import type { TrainingGenerationButton } from '../src/components/training/TrainingGenerationCard';

const appUpdateMock = vi.hoisted(() => ({ available: false }));

vi.mock('../src/app/useAppUpdateAvailable', () => ({
  useAppUpdateAvailable: () => appUpdateMock.available,
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function languageButtons(): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll<HTMLButtonElement>('.training-header-language-tab'));
}

beforeEach(() => {
  vi.useFakeTimers();
  appUpdateMock.available = false;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
    root.unmount();
  });
  host.remove();
  vi.useRealTimers();
});

describe('TrainingHeader', () => {
  it('renders the Home button and reports app return clicks', () => {
    const backToApp = vi.fn();

    act(() => {
      root.render(createElement(TrainingHeader, {
        selectedLanguage: 'de',
        onChangeLanguage: vi.fn(),
        onBackToApp: backToApp,
      }));
    });

    const homeButton = host.querySelector<HTMLButtonElement>('.training-header-button');
    expect(homeButton?.textContent).toBe('Home');
    expect(homeButton?.getAttribute('aria-label')).toBe('Return to Dicta home');
    expect(homeButton?.getAttribute('title')).toBe('Return to Dicta home');

    act(() => {
      homeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(backToApp).toHaveBeenCalledTimes(1);
  });

  it('renders the app update action beside Home when an update is available', () => {
    appUpdateMock.available = true;

    act(() => {
      root.render(createElement(TrainingHeader, {
        selectedLanguage: 'de',
        onChangeLanguage: vi.fn(),
        onBackToApp: vi.fn(),
      }));
    });

    const actions = host.querySelector<HTMLElement>('.training-header-actions');
    const actionButtons = Array.from(actions?.querySelectorAll<HTMLButtonElement>('button') ?? []);

    expect(host.querySelector('.training-header-update-banner')).toBeNull();
    expect(actionButtons.map((button) => button.textContent)).toEqual(['Update', 'Home']);
    expect(actionButtons[0].classList.contains('training-header-update-button')).toBe(true);
    expect(actionButtons[0].getAttribute('aria-label')).toBe('Update Dicta to the latest app version');
  });

  it('renders the five global language buttons and reports selections after the next task', () => {
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

    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'true', 'false']);
    expect(changes).not.toHaveBeenCalled();

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(changes).toHaveBeenCalledWith('fr');
  });

  it('renders generation actions inside the floating language header', () => {
    const generatePrecision = vi.fn();

    act(() => {
      root.render(createElement(TrainingHeader, {
        selectedLanguage: 'de',
        onChangeLanguage: vi.fn(),
        onBackToApp: vi.fn(),
        generationButtons: [
          generationButton({ id: 'easy', label: 'New Easy Session', onClick: generatePrecision }),
          generationButton({ id: 'medium', label: 'New Medium Session' }),
          generationButton({ id: 'hard', label: 'New Hard Session' }),
        ],
      }));
    });

    const generationCard = host.querySelector('.training-header .training-header-generation-card');
    const generationButtons = Array.from(generationCard?.querySelectorAll<HTMLButtonElement>('.training-generation-button') ?? []);
    const generationDurations = Array.from(generationCard?.querySelectorAll<HTMLElement>('.training-generation-duration') ?? []);

    expect(generationCard).not.toBeNull();
    expect(generationButtons.map((button) => button.textContent)).toEqual(['Precision', 'Stabilize', 'Challenge']);
    expect(generationDurations.map((duration) => duration.textContent)).toEqual([
      'Approx. 3 min audio',
      'Approx. 3 min audio',
      'Approx. 3 min audio',
    ]);
    expect(host.querySelector('.adaptive-flow-direct-duration-button')).toBeNull();

    act(() => {
      generationButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(generatePrecision).toHaveBeenCalledTimes(1);
  });
});

function generationButton(overrides: Partial<TrainingGenerationButton> & Pick<TrainingGenerationButton, 'id' | 'label'>): TrainingGenerationButton {
  return {
    title: 'Generate a session',
    disabled: false,
    onClick: () => undefined,
    ...overrides,
  };
}
